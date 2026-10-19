import {
  ApiSessionError,
  CONTRACT_PAGE_SIZE,
  getContractDetails,
  getCreatedContracts,
  getCustomerImage,
  getDashboardStatistics,
  getErrorMessage,
  getSettings,
  getUploadedImage,
  signIn,
  synchronizeContractStatus
} from "./api.js";
import { demoContracts, extractContractDetails, extractContractPage, isFinalizedContract, isPendingApprovalContract, statusLabels } from "./contracts.js";
import { hydrateIcons, renderContractDetailTabs, renderContractDetails, renderContractList, renderStats, updateSyncElapsedTimers } from "./ui.js";

const AUTH_STORAGE_KEY = "hdsaison.portal.session";
const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000;
const pages = {
  dashboard: { id: "dashboardPage", title: "Tổng quan" },
  contracts: { id: "contractsPage", title: "Hợp đồng" },
  create: { id: "createPage", title: "Tạo hợp đồng" }
};
const otherTitles = {
  offers: "Tìm scheme ưu đãi",
  orders: "Đơn hàng từ đối tác",
  risk: "Chỉ số rủi ro",
  lookup: "Tra cứu đơn vay"
};

const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("contractSearch");
let contracts = [...demoContracts];
let authSession = null;
let dashboardStatistics = null;
let expirationTimer;
let autoSyncTimer;
let syncElapsedTimer;
let toastTimer;
let contractPage = 0;
let contractTotalElements = contracts.length;
let contractTotalPages = 1;
let usingLiveContracts = false;
let contractRequestId = 0;
let contractSearchTimer;
let contractDetailRequestId = 0;
let uploadedImageRequestId = 0;
const uploadedImageUrls = new Set();
let activeContractDetails = null;
let activeContractDetailTab = "tracking";
let contractLoadError = "";
let contractSyncMessage = "";
let contractsRequested = false;
let autoSyncRunning = false;
const syncingContracts = new Set();
const syncStartedAt = new Map();

function renderContractView() {
  renderContractList({
    contracts,
    totalElements: contractTotalElements,
    page: contractPage,
    totalPages: contractTotalPages,
    pageSize: CONTRACT_PAGE_SIZE,
    query: searchInput.value,
    selectedStatus: statusFilter.value,
    loadError: contractLoadError,
    syncingContracts,
    syncStartedAt,
    syncMessage: contractSyncMessage
  });
}

function startContractSyncTimer() {
  if (!syncElapsedTimer) {
    syncElapsedTimer = window.setInterval(updateSyncElapsedTimers, 1000);
  }
}

function markContractSyncStarted(contractNumber) {
  syncingContracts.add(contractNumber);
  syncStartedAt.set(contractNumber, Date.now());
  startContractSyncTimer();
}

function markContractSyncFinished(contractNumber) {
  syncingContracts.delete(contractNumber);
  syncStartedAt.delete(contractNumber);
  if (syncStartedAt.size === 0) {
    window.clearInterval(syncElapsedTimer);
    syncElapsedTimer = undefined;
  }
}

function setAccountDetails(user) {
  const name = user.name || user.userName || "Đối tác";
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi");
  document.getElementById("profileName").textContent = name;
  document.getElementById("menuProfileName").textContent = name;
  document.getElementById("profileGroup").textContent = user.userGroupType || "Đối tác";
  document.getElementById("menuProfileGroup").textContent = user.userName || user.userGroupType || "Đối tác";
  document.getElementById("profileAvatar").textContent = initials;
  document.getElementById("welcomeName").textContent = name;
}

function persistSession(user) {
  const accessExpire = Number(user.accessExpire);
  if (!user || !user.accessToken || user.id == null || !Number.isFinite(accessExpire) || accessExpire <= 0) {
    throw new Error("Thông tin phiên đăng nhập trả về từ máy chủ chưa đầy đủ.");
  }
  authSession = {
    accessToken: user.accessToken,
    tokenType: user.tokenType || "Bearer",
    id: user.id,
    userName: user.userName || "",
    name: user.name || "",
    userGroupType: user.userGroupType || "",
    expiresAt: Date.now() + accessExpire
  };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
  setAccountDetails(authSession);
  scheduleSessionExpiration();
}

function scheduleSessionExpiration() {
  window.clearTimeout(expirationTimer);
  if (!authSession) return;
  expirationTimer = window.setTimeout(
    () => endSession("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."),
    Math.max(0, authSession.expiresAt - Date.now())
  );
}

function setLoginError(message) {
  const errorElement = document.getElementById("loginError");
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function clearLoginError() {
  const errorElement = document.getElementById("loginError");
  errorElement.textContent = "";
  errorElement.hidden = true;
}

function showAuthenticatedApp() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("appShell").hidden = false;
}

function stopAutoSync() {
  window.clearTimeout(autoSyncTimer);
  autoSyncTimer = undefined;
}

function endSession(message) {
  stopAutoSync();
  window.clearTimeout(expirationTimer);
  contractRequestId += 1;
  closeContractDetails();
  authSession = null;
  dashboardStatistics = null;
  contractsRequested = false;
  syncingContracts.clear();
  syncStartedAt.clear();
  window.clearInterval(syncElapsedTimer);
  syncElapsedTimer = undefined;
  contractSyncMessage = "";
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  document.getElementById("appShell").hidden = true;
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("loginForm").reset();
  if (message) setLoginError(message);
}

function showToast(message) {
  document.getElementById("toastMessage").textContent = message;
  const toast = document.getElementById("toast");
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3000);
}

function closeContractDetails() {
  contractDetailRequestId += 1;
  clearUploadedImageUrls();
  activeContractDetails = null;
  activeContractDetailTab = "tracking";
  document.getElementById("contractDetailOverlay").hidden = true;
  document.getElementById("contractDetailLoading").hidden = true;
  document.getElementById("contractDetailError").hidden = true;
  document.getElementById("contractDetailContent").replaceChildren();
}

function clearUploadedImageUrls() {
  uploadedImageRequestId += 1;
  uploadedImageUrls.forEach((url) => URL.revokeObjectURL(url));
  uploadedImageUrls.clear();
}

function loadUploadedImages() {
  const session = authSession;
  const requestId = uploadedImageRequestId;
  if (!session) return;
  document.querySelectorAll("#contractDetailContent img[data-upload-image-id], #contractDetailContent img[data-contract-image-id]").forEach(async (image) => {
    const contractFileCode = image.dataset.contractImageId;
    const contractImageKind = image.dataset.contractImageKind;
    const imageId = image.dataset.uploadImageId || contractFileCode;
    const loading = image.parentElement.querySelector(".contract-image-loading");
    const error = image.parentElement.querySelector(".contract-image-error");
    try {
      const blob = contractFileCode
        ? await getCustomerImage(session, contractFileCode, contractImageKind)
        : await getUploadedImage(session, imageId);
      if (requestId !== uploadedImageRequestId || authSession !== session) return;
      const url = URL.createObjectURL(blob);
      uploadedImageUrls.add(url);
      image.addEventListener("load", () => {
        image.hidden = false;
        loading.hidden = true;
      }, { once: true });
      image.addEventListener("error", () => {
        image.hidden = true;
        loading.hidden = true;
        error.textContent = `Không thể hiển thị hình ảnh (mã ${imageId}).`;
        error.hidden = false;
      }, { once: true });
      image.hidden = false;
      loading.hidden = true;
      image.src = url;
    } catch (imageError) {
      if (requestId !== uploadedImageRequestId || authSession !== session) return;
      if (imageError instanceof ApiSessionError) {
        endSession(imageError.message);
        return;
      }
      loading.hidden = true;
      error.textContent = `${getErrorMessage(imageError)} (mã ${imageId}).`;
      error.hidden = false;
    }
  });
}

function renderActiveContractDetails() {
  if (!activeContractDetails) return;
  clearUploadedImageUrls();
  document.getElementById("contractDetailTabs").innerHTML = renderContractDetailTabs(activeContractDetailTab);
  document.getElementById("contractDetailContent").innerHTML = renderContractDetails(activeContractDetails, activeContractDetailTab);
  loadUploadedImages();
}

async function showContractDetails(contract) {
  if (!authSession || !contract.number || contract.number === "—") return;
  const session = authSession;
  const requestId = ++contractDetailRequestId;
  const overlay = document.getElementById("contractDetailOverlay");
  const loading = document.getElementById("contractDetailLoading");
  const error = document.getElementById("contractDetailError");
  const content = document.getElementById("contractDetailContent");
  const contractStatus = contract.statusLabel || statusLabels[contract.status];
  document.getElementById("contractDetailTitle").textContent = contractStatus
    ? `Hợp đồng ${contract.number} (${contractStatus})`
    : `Hợp đồng ${contract.number}`;
  document.getElementById("contractDetailCustomer").textContent = contract.customer;
  activeContractDetailTab = "tracking";
  document.getElementById("contractDetailTabs").innerHTML = renderContractDetailTabs(activeContractDetailTab);
  loading.hidden = false;
  error.hidden = true;
  error.textContent = "";
  content.replaceChildren();
  overlay.hidden = false;
  document.getElementById("closeContractDetails").focus();
  try {
    const payload = await getContractDetails(session, contract.number);
    if (requestId !== contractDetailRequestId || authSession !== session) return;
    activeContractDetails = extractContractDetails(payload);
    renderActiveContractDetails();
  } catch (detailError) {
    if (requestId !== contractDetailRequestId || authSession !== session) return;
    if (detailError instanceof ApiSessionError) {
      endSession(detailError.message);
      return;
    }
    error.textContent = `Không tải được chi tiết hợp đồng: ${getErrorMessage(detailError)}`;
    error.hidden = false;
  } finally {
    if (requestId === contractDetailRequestId) loading.hidden = true;
  }
}

async function loadContractsPage(page = contractPage) {
  const session = authSession;
  if (!session) return;
  const requestId = ++contractRequestId;
  contractsRequested = true;
  contractSyncMessage = "";
  contractLoadError = "";
  document.getElementById("emptyState").hidden = true;
  document.querySelector(".full-table").parentElement.hidden = false;
  document.getElementById("allContracts").innerHTML = "";
  document.getElementById("recentContracts").innerHTML = "";
  document.getElementById("allCount").textContent = "0";
  document.getElementById("resultCount").textContent = "Đang tải hợp đồng...";
  try {
    const payload = await getCreatedContracts(session, {
      page,
      contractNumber: searchInput.value.trim()
    });
    if (requestId !== contractRequestId || authSession !== session) return;
    const result = extractContractPage(payload);
    usingLiveContracts = true;
    contracts = result.contracts;
    contractTotalElements = result.totalElements;
    contractTotalPages = Math.max(1, result.totalPages);
    contractPage = result.currentPage;
  } catch (error) {
    if (requestId !== contractRequestId || authSession !== session) return;
    if (error instanceof ApiSessionError) {
      endSession(error.message);
      throw error;
    }
    usingLiveContracts = true;
    contracts = [];
    contractTotalElements = 0;
    contractTotalPages = 1;
    contractPage = page;
    contractLoadError = getErrorMessage(error);
    renderContractView();
    throw error;
  }
  renderContractView();
}

function handleApiSessionError(error) {
  if (error instanceof ApiSessionError && authSession) {
    endSession(error.message);
  }
}

async function loadPortalData() {
  const session = authSession;
  if (!session) return;
  dashboardStatistics = null;
  renderStats(dashboardStatistics, contractTotalElements);
  document.getElementById("apiAlert").hidden = true;
  const requests = await Promise.allSettled([
    getDashboardStatistics(session),
    getSettings(session),
    loadContractsPage(0)
  ]);
  if (authSession !== session) return;
  const errors = [];
  if (requests[0].status === "fulfilled" && requests[0].value && typeof requests[0].value === "object") {
    dashboardStatistics = requests[0].value;
    renderStats(dashboardStatistics, contractTotalElements);
  } else if (requests[0].status === "rejected") {
    dashboardStatistics = {};
    renderStats(dashboardStatistics, contractTotalElements);
    handleApiSessionError(requests[0].reason);
    errors.push(`thống kê: ${getErrorMessage(requests[0].reason)}`);
  } else {
    dashboardStatistics = {};
    renderStats(dashboardStatistics, contractTotalElements);
    errors.push("thống kê: dữ liệu API không đúng định dạng.");
  }
  if (requests[1].status === "fulfilled" && Array.isArray(requests[1].value) && requests[1].value[0]) {
    const settings = requests[1].value[0];
    if (settings.frontendVersion) {
      document.querySelector(".sidebar-footer span").textContent = `v${settings.frontendVersion}`;
    }
  } else if (requests[1].status === "rejected") {
    handleApiSessionError(requests[1].reason);
    errors.push(`cấu hình: ${getErrorMessage(requests[1].reason)}`);
  } else {
    errors.push("cấu hình: dữ liệu API không đúng định dạng.");
  }
  if (requests[2].status === "rejected") {
    handleApiSessionError(requests[2].reason);
    errors.push(`hợp đồng: ${getErrorMessage(requests[2].reason)}`);
  }
  if (authSession !== session) return;
  const alert = document.getElementById("apiAlert");
  alert.textContent = errors.length
    ? `Không tải được ${errors.join("; ")}. Kiểm tra kết nối API/CORS hoặc đăng nhập lại.`
    : "";
  alert.hidden = errors.length === 0;
  scheduleAutoSync();
}

function scheduleAutoSync() {
  stopAutoSync();
  if (!authSession || document.hidden) return;
  autoSyncTimer = window.setTimeout(runAutoSync, AUTO_SYNC_INTERVAL_MS);
}

async function runAutoSync() {
  const session = authSession;
  if (!session || document.hidden || autoSyncRunning) {
    scheduleAutoSync();
    return;
  }
  autoSyncRunning = true;
  const failures = [];
  let contractNumbers = [];
  let succeeded = 0;
  try {
    try {
      await loadContractsPage(contractPage);
    } catch (error) {
      if (error instanceof ApiSessionError) {
        handleApiSessionError(error);
        return;
      }
      failures.push(`Không tải được danh sách hợp đồng: ${getErrorMessage(error)}`);
    }
    if (authSession !== session) return;
    contractNumbers = [...new Set(
      contracts.filter(isPendingApprovalContract).map((contract) => contract.number).filter(Boolean)
    )];
    contractSyncMessage = contractNumbers.length
      ? "Đang tự động đồng bộ các hợp đồng chờ phê duyệt..."
      : "Không có hợp đồng chờ phê duyệt cần đồng bộ trên trang hiện tại.";
    renderContractView();
    for (const contractNumber of contractNumbers) {
      if (authSession !== session || document.hidden) break;
      if (syncingContracts.has(contractNumber)) continue;
      markContractSyncStarted(contractNumber);
      renderContractView();
      try {
        await synchronizeContractStatus(session, contractNumber);
        succeeded += 1;
      } catch (error) {
        if (error instanceof ApiSessionError) {
          handleApiSessionError(error);
          break;
        }
        failures.push(`${contractNumber}: ${getErrorMessage(error)}`);
      } finally {
        markContractSyncFinished(contractNumber);
        if (authSession === session) renderContractView();
      }
    }
    if (authSession !== session) return;
    if (succeeded > 0 && !document.hidden) {
      try {
        await loadContractsPage(contractPage);
      } catch (error) {
        failures.push(`Không tải lại được danh sách sau khi đồng bộ: ${getErrorMessage(error)}`);
      }
    }
    if (authSession !== session) return;
    contractSyncMessage = failures.length
      ? `${contractNumbers.length ? `Đã đồng bộ ${succeeded}/${contractNumbers.length} hợp đồng chờ phê duyệt. ` : ""}${failures[0]}`
      : contractNumbers.length
        ? `Đã tự động đồng bộ ${succeeded}/${contractNumbers.length} hợp đồng chờ phê duyệt lúc ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date())}.`
        : "Không có hợp đồng chờ phê duyệt cần đồng bộ trên trang hiện tại.";
  } finally {
    autoSyncRunning = false;
    if (authSession === session) {
      renderContractView();
      scheduleAutoSync();
    }
  }
}

async function syncContractManually(contractNumber) {
  const session = authSession;
  const contract = contracts.find((item) => item.number === contractNumber);
  if (!session || syncingContracts.has(contractNumber) || isFinalizedContract(contract)) return;
  markContractSyncStarted(contractNumber);
  contractSyncMessage = "";
  renderContractView();
  try {
    await synchronizeContractStatus(session, contractNumber);
    if (authSession !== session) return;
    try {
      await loadContractsPage(contractPage);
    } catch (error) {
      if (authSession === session) {
        contractSyncMessage = `Đã gửi yêu cầu đồng bộ ${contractNumber}, nhưng không tải lại được danh sách: ${getErrorMessage(error)}`;
        renderContractView();
        showToast("Đã gửi yêu cầu đồng bộ, nhưng cập nhật danh sách thất bại.");
      }
      return;
    }
    showToast(`Đã gửi yêu cầu đồng bộ cho hợp đồng ${contractNumber}.`);
  } catch (error) {
    if (authSession !== session) return;
    handleApiSessionError(error);
    if (authSession === session) {
      contractSyncMessage = `Không đồng bộ được ${contractNumber}: ${getErrorMessage(error)}`;
      renderContractView();
      showToast(`Không đồng bộ được ${contractNumber}.`);
    }
  } finally {
    markContractSyncFinished(contractNumber);
    if (authSession === session) renderContractView();
  }
}

function restoreSession() {
  const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return;
  let savedSession;
  try {
    savedSession = JSON.parse(stored);
  } catch {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setLoginError("Không thể khôi phục phiên đăng nhập. Vui lòng đăng nhập lại.");
    return;
  }
  if (!savedSession.accessToken || !savedSession.id || !Number.isFinite(savedSession.expiresAt) || savedSession.expiresAt <= Date.now()) {
    endSession("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    return;
  }
  authSession = savedSession;
  setAccountDetails(authSession);
  scheduleSessionExpiration();
  showAuthenticatedApp();
  loadPortalData();
}

function showPage(pageName) {
  const page = pages[pageName];
  const isOther = !page;
  document.querySelectorAll(".page-view").forEach((view) => view.classList.remove("active"));
  document.getElementById(isOther ? "otherPage" : page.id).classList.add("active");
  document.getElementById("breadcrumb").textContent = isOther ? otherTitles[pageName] || "HDSAISON Portal" : page.title;
  document.getElementById("otherTitle").textContent = otherTitles[pageName] || "Tính năng sắp ra mắt";
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === pageName));
  document.getElementById("appShell").classList.remove("menu-open");
  if (pageName === "contracts" && authSession && (!contractsRequested || contractLoadError)) {
    loadContractsPage(0).catch(() => {});
  }
  if (pageName === "create") {
    const selectedProduct = document.querySelector(".product-card[data-product].selected");
    if (selectedProduct) {
      const radio = [...document.querySelectorAll('input[name="product"]')].find((input) => input.value === selectedProduct.dataset.product);
      if (radio) selectProduct(radio);
    }
  }
}

function selectProduct(input) {
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.classList.toggle("selected", card.querySelector("input") === input);
  });
}

function exportContracts() {
  const query = searchInput.value.trim().toLocaleLowerCase("vi");
  const selectedStatus = statusFilter.value;
  const rows = contracts.filter((item) => {
      const matchesQuery = !query || `${item.number} ${item.id} ${item.customer} ${item.product}`.toLocaleLowerCase("vi").includes(query);
    return matchesQuery && (selectedStatus === "all" || item.status === selectedStatus);
  });
  const csv = ["Mã hợp đồng,Khách hàng,Sản phẩm,Trạng thái,Ngày tạo,Số tiền", ...rows.map((item) =>
      [item.number || item.id, item.customer, item.product, item.statusLabel || statusLabels[item.status], item.created, item.amount].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  )].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "danh-sach-hop-dong.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Đã xuất ${rows.length} hợp đồng ra tệp CSV.`);
}

hydrateIcons();
renderStats(null, contractTotalElements);
renderContractView();
document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
}).format(new Date());

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const syncButton = target.closest("[data-sync-contract]");
  if (syncButton) {
    event.preventDefault();
    event.stopPropagation();
    syncContractManually(syncButton.dataset.syncContract);
    return;
  }
  const pageButton = target.closest("[data-page]");
  if (pageButton) {
    event.preventDefault();
    showPage(pageButton.dataset.page);
  }
  const productButton = target.closest("[data-product]");
  if (productButton) {
    document.querySelectorAll(".product-card").forEach((card) => card.classList.remove("selected"));
    productButton.classList.add("selected");
    showPage("create");
  }
  const contractButton = target.closest("[data-contract-id]");
  if (contractButton) {
    const contract = contracts.find((item) => item.id === contractButton.dataset.contractId);
    if (contract) showContractDetails(contract);
  }
});

document.getElementById("closeContractDetails").addEventListener("click", closeContractDetails);
document.getElementById("contractDetailTabs").addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const tab = target && target.closest("[data-detail-tab]");
  if (!tab || !activeContractDetails) return;
  activeContractDetailTab = tab.dataset.detailTab;
  renderActiveContractDetails();
});
document.getElementById("contractDetailOverlay").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeContractDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.getElementById("contractDetailOverlay").hidden) {
    closeContractDetails();
  }
});
document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("appShell").classList.toggle("menu-open");
});
document.getElementById("sidebarBackdrop").addEventListener("click", () => {
  document.getElementById("appShell").classList.remove("menu-open");
});
document.getElementById("profileButton").addEventListener("click", () => {
  const menu = document.getElementById("profileMenu");
  menu.hidden = !menu.hidden;
});
document.getElementById("logoutButton").addEventListener("click", () => {
  document.getElementById("profileMenu").hidden = true;
  endSession(null);
  clearLoginError();
});
document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const username = String(formData.get("username")).trim();
  const password = String(formData.get("password"));
  submitButton.disabled = true;
  submitButton.textContent = "Đang đăng nhập...";
  clearLoginError();
  try {
    const user = await signIn(username, password);
    persistSession(user);
    showAuthenticatedApp();
    form.reset();
    showPage("dashboard");
    showToast(`Đăng nhập thành công. Chào mừng ${user.name || user.userName || "bạn"}.`);
    loadPortalData();
  } catch (error) {
    const message = error instanceof TypeError
      ? "Không thể kết nối máy chủ đăng nhập. Kiểm tra kết nối mạng và cấu hình CORS của API."
      : getErrorMessage(error);
    setLoginError(message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = `Đăng nhập <span data-icon="arrow"></span>`;
    hydrateIcons(submitButton);
  }
});
document.getElementById("togglePassword").addEventListener("click", (event) => {
  const password = document.getElementById("loginPassword");
  const isVisible = password.type === "text";
  password.type = isVisible ? "password" : "text";
  event.currentTarget.setAttribute("aria-label", isVisible ? "Hiện mật khẩu" : "Ẩn mật khẩu");
  event.currentTarget.innerHTML = `<span data-icon="${isVisible ? "eye" : "eyeOff"}"></span>`;
  hydrateIcons(event.currentTarget);
});
document.getElementById("forgotPassword").addEventListener("click", () => {
  showToast("Vui lòng liên hệ đội ngũ hỗ trợ để đặt lại mật khẩu.");
});
document.getElementById("filterTabs").addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target && target.closest("[data-filter]");
  if (!button) return;
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  statusFilter.value = button.dataset.filter;
  renderContractView();
});
statusFilter.addEventListener("change", () => {
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === statusFilter.value));
  renderContractView();
});
searchInput.addEventListener("input", () => {
  renderContractView();
  if (!authSession) return;
  window.clearTimeout(contractSearchTimer);
  contractSearchTimer = window.setTimeout(() => {
    loadContractsPage(0).catch(() => {});
  }, 350);
});
document.getElementById("paginationControls").addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-page-number], [data-page-step]") : null;
  if (!target || target.disabled) return;
  const page = target.dataset.pageNumber != null
    ? Number(target.dataset.pageNumber)
    : contractPage + Number(target.dataset.pageStep);
  if (Number.isInteger(page) && page >= 0 && page < contractTotalPages && page !== contractPage) {
    loadContractsPage(page).catch(() => {});
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    showPage("contracts");
    searchInput.focus();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAutoSync();
  else scheduleAutoSync();
});
document.querySelectorAll('input[name="product"]').forEach((input) => {
  input.addEventListener("change", () => selectProduct(input));
});
document.getElementById("createForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (usingLiveContracts) {
    showToast("API tạo hợp đồng chưa được cung cấp. Hồ sơ chưa được lưu.");
    return;
  }
  const formData = new FormData(form);
  const customer = String(formData.get("customer")).trim();
  const digits = String(formData.get("phone")).replace(/\D/g, "");
  const newContract = {
    id: `HPO-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Date.now()}`,
    customer,
    product: String(formData.get("product")),
    status: "review",
    created: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()),
    amount: String(formData.get("amount") || ""),
    phone: digits
  };
  contracts.unshift(newContract);
  contractTotalElements = contracts.length;
  form.reset();
  selectProduct(document.querySelector('input[name="product"]'));
  searchInput.value = "";
  statusFilter.value = "all";
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === "all"));
  renderContractView();
  showPage("contracts");
  showToast(`Đã tạo hồ sơ ${newContract.id} cho ${customer}.`);
});
document.getElementById("exportButton").addEventListener("click", exportContracts);

restoreSession();
