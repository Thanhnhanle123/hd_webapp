import { getContractFileCode, isFinalizedContract, productIcons, statusLabels } from "./contracts.js";

const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  receipt: '<path d="M4 3h16v18l-4-2-4 2-4-2-4 2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-6 6"/>',
  find: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/><path d="M8 10h5M10.5 7.5v5"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.8 1.2-1.8 2.7M12 17h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h16a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5M16 14h.01"/>',
  car: '<path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 11h18v8h-2v-2H5v2H3zM6 13h.01M18 13h.01M3 14H1M23 14h-2"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a14.8 14.8 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1 0 1.9-.2 2.8-.5"/>',
  sync: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3"/>'
};

const dashboardMetricDefinitions = [
  { key: "saleNeedFixDisbursementStatus", label: "Hợp đồng cần sửa lỗi chứng từ", icon: "file", color: "amber" },
  { key: "saleApproveStatus", label: "Hợp đồng đã phê duyệt", icon: "check", color: "green" },
  { key: "saleNeedSendHardCopyStatus", label: "Hợp đồng cần gửi hồ sơ", icon: "receipt", color: "blue" },
  { key: "saleApprovedDisbursementStatus", label: "Hợp đồng hoàn thành giải ngân", icon: "sparkle", color: "cyan" },
  { key: "saleErrorInHardCopyStatus", label: "Hợp đồng lỗi hồ sơ giấy", icon: "file", color: "red" },
  { key: "saleDraftStatus", label: "Hợp đồng lưu nháp", icon: "receipt", color: "gray" },
  { key: "additionalInfo", label: "Chờ khách bổ sung thông tin", icon: "help", color: "yellow" },
  { key: "finishAdditionalInfo", label: "Hoàn thành bổ sung thông tin", icon: "check", color: "green" }
];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    const path = icons[element.dataset.icon];
    if (path) element.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  });
}

function formatSyncElapsed(startedAt) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const parts = [minutes, seconds];
  if (hours) parts.unshift(hours);
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function updateSyncElapsedTimers() {
  document.querySelectorAll("[data-sync-elapsed]").forEach((element) => {
    const startedAt = Number(element.dataset.syncStartedAt);
    if (Number.isFinite(startedAt)) element.textContent = formatSyncElapsed(startedAt);
  });
}

function contractRow(contract, syncingContracts, syncStartedAt) {
  const id = escapeHtml(contract.id);
  const number = escapeHtml(contract.number);
  const isSyncing = Boolean(contract.number && syncingContracts.has(contract.number));
  const isFinalized = isFinalizedContract(contract);
  const syncStarted = isSyncing ? syncStartedAt.get(contract.number) : 0;
  const hasContractNumber = Boolean(contract.number);
  const syncTitle = isFinalized ? "Không cần đồng bộ" : "Đồng bộ trạng thái";
  return `<tr>
    <td class="contract-id">${number || id}</td>
    <td class="customer-name"><button class="customer-link" type="button" data-contract-id="${id}" ${hasContractNumber ? "" : "disabled"}>${escapeHtml(contract.customer)}</button></td>
    <td><span class="product-name"><span data-icon="${productIcons[contract.product] || "file"}"></span>${escapeHtml(contract.product)}</span></td>
    <td><span class="status-pill status-${escapeHtml(contract.status)}">${escapeHtml(contract.statusLabel || statusLabels[contract.status] || "Chưa xác định")}</span></td>
    <td>${escapeHtml(contract.created)}</td>
    <td><div class="contract-actions">
      <button class="row-action sync-action${isSyncing ? " is-syncing" : ""}" type="button" data-sync-contract="${number}" aria-label="${isFinalized ? "Không cần đồng bộ" : isSyncing ? "Đang đồng bộ" : "Đồng bộ"} ${number || id}" title="${syncTitle}" ${isSyncing || isFinalized || !hasContractNumber ? "disabled" : ""}><span data-icon="sync"></span></button>
      ${isSyncing && syncStarted ? `<span class="sync-elapsed" data-sync-elapsed data-sync-started-at="${syncStarted}" role="timer" aria-label="Thời gian đang đồng bộ">${formatSyncElapsed(syncStarted)}</span>` : ""}
      <button class="row-action" type="button" data-contract-id="${id}" aria-label="Xem ${number || id}" ${hasContractNumber ? "" : "disabled"}><span data-icon="arrow"></span></button>
    </div></td>
  </tr>`;
}

export function renderContractRows(contracts, syncingContracts, syncStartedAt) {
  return contracts.map((contract) => contractRow(contract, syncingContracts, syncStartedAt)).join("");
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index);
  const pages = new Set([0, totalPages - 1]);
  for (let page = Math.max(0, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
    pages.add(page);
  }
  return [...pages].sort((first, second) => first - second);
}

function renderPagination(currentPage, totalPages) {
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const buttons = [];
  let previousPage = -1;

  for (const page of visiblePages) {
    if (page - previousPage > 1) {
      buttons.push('<span class="pagination-ellipsis" aria-hidden="true">…</span>');
    }
    buttons.push(`<button class="page-number${page === currentPage ? " active" : ""}" type="button" data-page-number="${page}" aria-label="Trang ${page + 1}"${page === currentPage ? ' aria-current="page"' : ""}>${page + 1}</button>`);
    previousPage = page;
  }

  return `<button class="page-button" type="button" data-page-step="-1" aria-label="Trang trước"${currentPage === 0 ? " disabled" : ""}><span aria-hidden="true">‹</span></button>${buttons.join("")}<button class="page-button" type="button" data-page-step="1" aria-label="Trang sau"${currentPage >= totalPages - 1 ? " disabled" : ""}><span aria-hidden="true">›</span></button>`;
}

export function renderStats(statistics, contractCount) {
  document.getElementById("statsGrid").innerHTML = dashboardMetricDefinitions.map((metric) => {
    const value = statistics && statistics[metric.key] != null
      ? escapeHtml(String(statistics[metric.key]))
      : statistics ? "—" : "…";
    return `
    <article class="stat-card ${metric.color}">
      <div class="stat-top"><span>${metric.label}</span><span class="stat-icon" data-icon="${metric.icon}"></span></div>
      <strong>${value}</strong>
      <small>Thống kê từ hệ thống</small>
    </article>`;
  }).join("");
  document.getElementById("navContractCount").textContent = String(contractCount);
  hydrateIcons(document.getElementById("statsGrid"));
}

export function renderContractList({
  contracts,
  totalElements,
  page,
  totalPages,
  pageSize,
  query,
  selectedStatus,
  loadError,
  syncingContracts,
  syncStartedAt,
  syncMessage
}) {
  document.getElementById("recentContracts").innerHTML = renderContractRows(contracts.slice(0, 5), syncingContracts, syncStartedAt);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const filtered = contracts.filter((item) => {
    const matchesQuery = !normalizedQuery || `${item.number} ${item.id} ${item.customer} ${item.product}`.toLocaleLowerCase("vi").includes(normalizedQuery);
    return matchesQuery && (selectedStatus === "all" || item.status === selectedStatus);
  });
  document.getElementById("allContracts").innerHTML = renderContractRows(filtered, syncingContracts, syncStartedAt);
  document.getElementById("allCount").textContent = String(totalElements);
  document.getElementById("navContractCount").textContent = String(totalElements);
  const firstItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const lastItem = Math.min((page + 1) * pageSize, totalElements);
  document.getElementById("resultCount").textContent = `Đang xem ${firstItem}–${lastItem} / ${totalElements} hồ sơ`;
  document.getElementById("emptyState").hidden = filtered.length > 0 || Boolean(loadError);
  document.getElementById("emptyStateMessage").textContent = totalElements === 0 && !query.trim()
    ? "Chưa có hợp đồng nào được tạo cho tài khoản này."
    : "Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả.";
  document.querySelector(".full-table").parentElement.hidden = Boolean(loadError);
  document.querySelector(".pagination").hidden = Boolean(loadError) || totalElements === 0;
  const errorElement = document.getElementById("contractsApiError");
  errorElement.textContent = loadError;
  errorElement.hidden = !loadError;
  const syncElement = document.getElementById("contractSyncNotice");
  syncElement.textContent = syncMessage;
  syncElement.hidden = !syncMessage;
  document.getElementById("paginationControls").innerHTML = renderPagination(page, totalPages);
  hydrateIcons(document.getElementById("recentContracts"));
  hydrateIcons(document.getElementById("allContracts"));
}

const detailTabDefinitions = [
  ["tracking", "Theo dõi hợp đồng"],
  ["customer", "Thông tin khách hàng"],
  ["product", "Thông tin hàng hóa"],
  ["documents", "Chứng từ"],
  ["contracts", "Bộ hợp đồng"]
];
const detailFieldLabels = {
  code: "Mã hợp đồng",
  number: "Số hợp đồng",
  contractnumber: "Số hợp đồng",
  contractno: "Số hợp đồng",
  contractid: "Mã hợp đồng",
  status: "Trạng thái",
  statusname: "Trạng thái",
  statusdescription: "Mô tả trạng thái",
  result: "Kết quả",
  approveddate: "Ngày phê duyệt",
  startinginstallmentdate: "Ngày bắt đầu trả góp",
  updatedby: "Người cập nhật",
  loginfaildate: "Ngày đăng nhập thất bại",
  simulationid: "Mã mô phỏng",
  nationalissueddate: "Ngày cấp CCCD",
  nationalexpirydate: "Ngày hết hạn CCCD",
  nationalfrontsideimageurl: "Ảnh mặt trước CCCD",
  nationalbacksideimageurl: "Ảnh mặt sau CCCD",
  personalimageurl: "Ảnh khách hàng",
  joiningcompanydate: "Ngày gia nhập công ty",
  tenor: "Kỳ hạn vay",
  tenorinmonths: "Kỳ hạn vay (tháng)",
  monthlyinstallment: "Số tiền trả góp hàng tháng",
  rejectedreason: "Lý do từ chối",
  createdduration: "Thời gian từ lúc tạo",
  lastlogin: "Lần đăng nhập gần nhất",
  lastlogindate: "Ngày đăng nhập gần nhất",
  indus: "Trạng thái hồ sơ",
  stage: "Giai đoạn",
  stagename: "Giai đoạn",
  phase: "Giai đoạn",
  phasename: "Giai đoạn",
  approvalstatus: "Kết quả phê duyệt",
  disbursementstatus: "Trạng thái giải ngân",
  documentstatus: "Trạng thái chứng từ",
  maritalstatus: "Tình trạng hôn nhân",
  hardcopystatus: "Trạng thái hồ sơ giấy",
  hardcopydocumentstatus: "Trạng thái hồ sơ giấy",
  createddate: "Ngày tạo",
  createdat: "Ngày tạo",
  updateddate: "Ngày cập nhật",
  updatedat: "Ngày cập nhật",
  resultdate: "Ngày trả kết quả",
  firstinstallmentdate: "Ngày đóng tiền đầu tiên",
  disbursementdate: "Ngày giải ngân",
  loandate: "Ngày giải ngân",
  customerid: "Mã khách hàng",
  customer: "Khách hàng",
  customername: "Khách hàng",
  borrowername: "Họ và tên khách hàng",
  firstname: "Tên",
  middlename: "Tên đệm",
  lastname: "Họ",
  name: "Tên",
  fullname: "Họ và tên",
  displayname: "Tên hiển thị",
  identitynumber: "Số CCCD",
  idnumber: "Số CCCD",
  identitytype: "Loại giấy tờ tùy thân",
  identitytypecode: "Loại giấy tờ tùy thân",
  identityissuedate: "Ngày cấp CCCD",
  identityissueplace: "Nơi cấp CCCD",
  phone: "Số điện thoại",
  phonenumber: "Số điện thoại",
  mobilenumber: "Số điện thoại di động",
  email: "Email",
  address: "Địa chỉ",
  dateofbirth: "Ngày sinh",
  dob: "Ngày sinh",
  gender: "Giới tính",
  gendername: "Giới tính",
  nationality: "Quốc tịch",
  occupation: "Nghề nghiệp",
  job: "Nghề nghiệp",
  income: "Thu nhập",
  monthlyincome: "Thu nhập hàng tháng",
  loanamount: "Số tiền vay",
  totalpurchase: "Tổng giá trị mua hàng",
  downpaymentamount: "Số tiền trả trước",
  downpaymentrate: "Tỷ lệ trả trước",
  financedamount: "Số tiền vay",
  approvedamount: "Số tiền được duyệt",
  disbursedamount: "Số tiền giải ngân",
  amount: "Số tiền",
  currency: "Đơn vị tiền tệ",
  product: "Sản phẩm",
  productname: "Tên sản phẩm",
  vehicle: "Phương tiện",
  brand: "Thương hiệu",
  model: "Dòng xe",
  color: "Màu sắc",
  licenseplate: "Biển số xe",
  enginenumber: "Số động cơ",
  chassisnumber: "Số khung",
  documents: "Chứng từ",
  document: "Chứng từ",
  documentname: "Tên chứng từ",
  documenttype: "Loại chứng từ",
  documentstatusname: "Trạng thái chứng từ",
  filename: "Tên tệp",
  id: "Mã",
  imageid: "Mã hình ảnh",
  uploadimageid: "Mã hình ảnh",
  imageurl: "Hình ảnh",
  customerimage: "Ảnh khách hàng",
  customerphoto: "Ảnh khách hàng",
  profileimage: "Ảnh khách hàng",
  profilephoto: "Ảnh khách hàng",
  customerimageid: "Mã ảnh khách hàng",
  customerphotoid: "Mã ảnh khách hàng",
  profileimageid: "Mã ảnh hồ sơ",
  profilephotoid: "Mã ảnh hồ sơ",
  photoid: "Mã ảnh",
  fileurl: "Tệp đính kèm",
  fileid: "Mã tệp",
  attachmentid: "Mã tệp đính kèm",
  attachmentname: "Tên tệp đính kèm",
  photo: "Hình ảnh",
  image: "Hình ảnh",
  note: "Ghi chú",
  notes: "Ghi chú",
  comment: "Ghi chú",
  remark: "Ghi chú",
  description: "Mô tả",
  reason: "Lý do",
  rejectreason: "Lý do từ chối",
  branch: "Chi nhánh",
  branchname: "Tên chi nhánh",
  sale: "Nhân viên kinh doanh",
  salename: "Nhân viên kinh doanh",
  username: "Tên người dùng",
  active: "Đang hoạt động",
};

const detailValueLabels = {
  WAITING: "Đang chờ xử lý",
  PENDING: "Đang chờ xử lý",
  IN_PROGRESS: "Đang xử lý",
  PROCESSING: "Đang xử lý",
  ADDITIONAL_INFO: "Chờ khách bổ sung thông tin",
  APPROVED: "Đã phê duyệt",
  APPROVE_STATUS: "Đã phê duyệt",
  APPROVE_DISBURSEMENT_STATUS: "Đã phê duyệt giải ngân",
  REJECTED: "Đã từ chối",
  DECLINED: "Đã từ chối",
  REJECT_STATUS: "Từ chối phê duyệt",
  VALID: "Hợp lệ",
  INVALID: "Không hợp lệ",
  MARRIED: "Đã kết hôn",
  SINGLE: "Độc thân",
  DIVORCED: "Đã ly hôn",
  WIDOWED: "Góa",
  MALE: "Nam",
  FEMALE: "Nữ",
  YES: "Có",
  NO: "Không",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động"
};

function detailLabel(key) {
  const normalizedKey = key.replace(/[_-]+/g, "").toLocaleLowerCase("en");
  return detailFieldLabels[normalizedKey] || key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\p{L}/u, (character) => character.toLocaleUpperCase("vi"));
}

function collectDetailEntries(value, prefix = "", depth = 0, entries = []) {
  if (value == null || entries.length >= 100 || depth > 6) return entries;
  if (Array.isArray(value)) {
    if (value.every((item) => item == null || typeof item !== "object")) {
      const values = value.filter((item) => item != null).map((item) => String(item));
      if (values.length && prefix) entries.push({
        path: prefix,
        label: detailLabel(prefix.split(" · ").at(-1)),
        value: values.join(", "),
        searchablePath: prefix.toLocaleLowerCase("vi")
      });
      return entries;
    }
    value.forEach((item) => collectDetailEntries(item, prefix, depth + 1, entries));
    return entries;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      if (/access.?token|refresh.?token|password|secret|authorization/i.test(key)) return;
      const path = prefix ? `${prefix} · ${key}` : key;
      collectDetailEntries(child, path, depth + 1, entries);
    });
    return entries;
  }
  if (prefix) {
    const keys = prefix.split(" · ");
    entries.push({
      path: prefix,
      label: detailLabel(keys.at(-1)),
      value: typeof value === "boolean" ? (value ? "Có" : "Không") : String(value),
      searchablePath: prefix.toLocaleLowerCase("vi")
    });
  }
  return entries;
}

function contractStatusClass(value) {
  if (/reject|declin|từ chối/i.test(value)) return "danger";
  if (/wait|pending|additional|review|chờ|bổ sung|đang xử lý/i.test(value)) return "pending";
  return "success";
}

function formatDetailDate(entry) {
  if (!/date|time|ngay|ngày|lastlogin/i.test(entry.searchablePath)) return entry.value;
  const value = entry.value.trim();
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const localizedDate = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  let date;
  if (isoDate) {
    date = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  } else if (localizedDate) {
    date = new Date(Number(localizedDate[3]), Number(localizedDate[2]) - 1, Number(localizedDate[1]));
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return entry.value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDetailValue(entry) {
  const path = entry.searchablePath;
  if (/date|time|ngay|ngày/i.test(path)) return formatDetailDate(entry);
  const normalizedValue = entry.value.trim().toLocaleUpperCase("en");
  if (/status|stage|phase|marital|gender|active/i.test(path) && detailValueLabels[normalizedValue]) {
    return detailValueLabels[normalizedValue];
  }
  if (!/(amount|income|salary|installment|fee|price|balance|disbursed|loanvalue|purchase|sotien)/i.test(path)) {
    return entry.value;
  }
  const numericValue = entry.value.replace(/[,\s]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(numericValue)) return entry.value;
  const amount = Number(numericValue);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(amount)
    : entry.value;
}

function resolveImageSource(entry) {
  const value = entry.value.trim();
  if (/^data:image\/(?:jpeg|jpg|png|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) {
    return value.replace(/\s/g, "");
  }
  if (/^(?:https?:\/\/|blob:)/i.test(value)) return value;
  if (/^(?:\/|\.\/|\.\.\/)[^\s]+/.test(value)) {
    try {
      return new URL(value, "https://hpo.hdsaison.com.vn").href;
    } catch {
      return "";
    }
  }
  if (/^[a-z0-9+/=\s]+$/i.test(value) && value.replace(/\s/g, "").length > 100) {
    return `data:image/jpeg;base64,${value.replace(/\s/g, "")}`;
  }
  return "";
}

function isImageEntry(entry) {
  return /image|img|photo|picture|portrait|ekyc|avatar|customer.?pic|profile.?pic|selfie|face|hinh|ảnh/i.test(entry.searchablePath);
}

function getUploadedImageIds(entry) {
  const pathParts = entry.path.split(" · ");
  const key = pathParts.at(-1).replace(/[_-]/g, "").toLocaleLowerCase("en");
  const imageContext = /image|img|photo|picture|portrait|ekyc|avatar|selfie|face|hinh|ảnh/i.test(entry.searchablePath);
  const documentContext = /(?:^|[ ·])(?:document|attachment|file|ekyc|chứng từ|giấy tờ)/i.test(entry.searchablePath);
  const imageIdentifier = /^(?:id|imageid|uploadimageid|fileid|attachmentid)$/.test(key) && (imageContext || documentContext);
  const namedImageIdentifier = /(?:image|img|photo|picture|portrait|avatar|selfie|face|hinh|pic)ids?$/.test(key)
    || /^(?:idimage|idimg|idphoto|idpicture|idportrait|idavatar|idselfie|idface|idpic)$/.test(key);
  const imageIdList = /(?:images|imageids|imgs|imgids|photos|photoids|pictures|pictureids|uploadimages)$/.test(key) && imageContext;
  const directImageReference = /(?:image|img|photo|picture|portrait|avatar|selfie|face|hinh|pic)$/.test(key);
  const imageValueId = imageContext && directImageReference && /^[a-z0-9_-]+$/i.test(entry.value.trim())
    ? [entry.value.trim()]
    : [];
  if (!imageIdentifier && !namedImageIdentifier && !imageIdList) return imageValueId;
  return entry.value.split(/[,;]/).map((value) => value.trim()).filter((value) => /^[a-z0-9_-]+$/i.test(value));
}

function parseContractNotes(value) {
  if (!value.includes("|==|") && !value.includes("|--|")) return null;
  return value.split("|==|").map((chunk) => {
    const fields = chunk.split("|--|").map((field) => field.trim()).filter((field) => field && field !== "--");
    if (!fields.length) return null;
    const dateIndex = fields.findIndex((field) => /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/i.test(field) || /^\d{4}-\d{2}-\d{2}/.test(field));
    const date = dateIndex >= 0 ? fields.splice(dateIndex, 1)[0] : "";
    const author = fields.length > 1 ? fields.shift() : "";
    const text = fields.join(" · ");
    return { author, text: text || author, date };
  }).filter((note) => note && (note.text || note.date));
}

function formatNoteDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
}

function renderContractNotes(entry) {
  const notes = parseContractNotes(entry.value);
  if (!notes) return "";
  return `<div class="contract-note-group"><strong>${escapeHtml(entry.label)}</strong>${notes.map((note) => `
    <article class="contract-note">
      <div class="contract-note-meta"><strong>${escapeHtml(note.author || "Ghi chú")}</strong>${note.date ? `<time>${escapeHtml(formatNoteDate(note.date))}</time>` : ""}</div>
      <p>${escapeHtml(note.text)}</p>
    </article>`).join("")}</div>`;
}

function renderDetailField(entry) {
  const noteContent = /note|comment|remark/i.test(entry.searchablePath) && renderContractNotes(entry);
  if (noteContent) return noteContent;
  const imageIds = getUploadedImageIds(entry);
  if (isImageEntry(entry)) {
    const imageSource = resolveImageSource(entry);
    if (imageSource) {
      return `<div class="contract-detail-image-field"><strong>${escapeHtml(entry.label)}</strong><img src="${escapeHtml(imageSource)}" alt="${escapeHtml(entry.label)}" loading="lazy" referrerpolicy="no-referrer" /></div>`;
    }
  }
  if (imageIds.length) {
    const customerImage = !/(?:^|[ ·])(?:document|attachment|file|ekyc)/i.test(entry.searchablePath)
      && /customer|borrower|person|profile|photo|portrait|avatar|selfie|face/i.test(entry.searchablePath);
    const fallbackLabel = customerImage ? "Ảnh khách hàng" : "Hình ảnh chứng từ";
    const label = entry.label.startsWith("Mã")
      ? fallbackLabel
      : entry.label;
    return imageIds.map((imageId) => `<div class="contract-detail-image-field"><strong>${escapeHtml(label)}</strong><img data-upload-image-id="${escapeHtml(imageId)}" alt="${escapeHtml(label)}" loading="lazy" hidden /><span class="contract-image-loading">Đang tải hình ảnh...</span><span class="contract-image-error" hidden></span></div>`).join("");
  }
  return `<div class="contract-detail-field"><dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(formatDetailValue(entry))}</dd></div>`;
}

function renderDetailFields(entries, emptyMessage) {
  if (!entries.length) return `<p class="contract-detail-empty">${escapeHtml(emptyMessage)}</p>`;
  return `<dl class="contract-detail-grid">${entries.map(renderDetailField).join("")}</dl>`;
}

function renderTrackingDetails(details, entries) {
  const contractCode = details.code || details.number || details.contractNumber || details.contractNo || details.contractCode || "";
  const statusEntries = entries.filter((entry) => /status|stage|phase|workflow|result|disburse|indus/i.test(entry.searchablePath)
    && !/date|time|ngay|ngày/i.test(entry.searchablePath));
  const dateEntries = entries.filter((entry) => /date|time|ngay|ngày/i.test(entry.searchablePath));
  const status = statusEntries[0];
  return `<section class="tracking-contract-card">
      <h3>Thông tin hợp đồng</h3>
      <div class="tracking-contract-summary">
        <strong>${escapeHtml(contractCode || entries.find((entry) => /contract(number|code|no)?/i.test(entry.searchablePath))?.value || "Hợp đồng")}</strong>
        ${status ? `<span class="tracking-status-label">${escapeHtml(status.label)}</span><span class="tracking-status ${contractStatusClass(status.value)}">${escapeHtml(formatDetailValue(status))}</span>` : ""}
      </div>
      ${statusEntries.length > 1 ? `<div class="tracking-timeline">${statusEntries.slice(1, 5).map((entry) => `<div class="tracking-timeline-item"><span>${escapeHtml(entry.label)}</span><strong class="tracking-status ${contractStatusClass(entry.value)}">${escapeHtml(formatDetailValue(entry))}</strong></div>`).join("")}</div>` : ""}
      ${dateEntries.length ? `<div class="tracking-dates">${dateEntries.slice(0, 8).map((entry) => `<div><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(formatDetailDate(entry))}</strong></div>`).join("")}</div>` : ""}
    </section>
    <section class="tracking-extra">
      <h3>Thông tin hồ sơ</h3>
      ${renderDetailFields(entries.filter((entry) => !statusEntries.includes(entry) && !dateEntries.includes(entry)
        && !isImageEntry(entry) && !getUploadedImageIds(entry).length).slice(0, 20), "Chưa có thông tin bổ sung cho hồ sơ này.")}
    </section>`;
}

function renderDocumentDetails(entries, tab) {
  const relevantEntries = tab === "contracts"
    ? entries.filter((entry) => /contract|agreement|signature|esign|template|hợp đồng/i.test(entry.searchablePath))
    : entries.filter((entry) => /document|attachment|file|image|photo|picture|ekyc|identity|idcard|certificate|paper|imageurl|fileurl|chứng từ|giấy tờ/i.test(entry.searchablePath)
      && !/contract|agreement|signature|esign|template|customer|borrower|profile(?:image|photo)?(?:id)?/i.test(entry.searchablePath));
  if (!relevantEntries.length) {
    return `<section class="document-group"><h3>${tab === "contracts" ? "Bộ hợp đồng" : "Hình ảnh eKYC và chứng từ"}</h3><p>Chưa có thông tin ${tab === "contracts" ? "bộ hợp đồng" : "chứng từ"} trong dữ liệu API.</p></section>`;
  }
  return `<section class="document-group"><h3>${tab === "contracts" ? "Bộ hợp đồng" : "Hình ảnh eKYC và chứng từ"}</h3>${renderDetailFields(relevantEntries, "")}</section>`;
}

export function renderContractDetails(details, tab = "tracking") {
  const entries = collectDetailEntries(details);
  if (!entries.length) {
    return '<p class="contract-detail-empty">Hợp đồng chưa có thông tin chi tiết để hiển thị.</p>';
  }
  if (tab === "tracking") return renderTrackingDetails(details, entries);
  if (tab === "documents" || tab === "contracts") return renderDocumentDetails(entries, tab);
  const customerEntries = details.customer && typeof details.customer === "object"
    ? collectDetailEntries(details.customer, "customer")
    : [];
  const relevantEntries = tab === "customer"
    ? customerEntries.filter((entry) =>
      !/(?:^|[ ·])(?:nationalfrontsideimageurl|nationalbacksideimageurl|personalimageurl)$/i.test(entry.searchablePath)
    ).sort((left, right) => {
      const nameOrder = (path) => /lastname/.test(path) ? 0 : /middlename/.test(path) ? 1 : /firstname/.test(path) ? 2 : 3;
      return nameOrder(left.searchablePath) - nameOrder(right.searchablePath);
    })
    : entries.filter((entry) => /product|goods|vehicle|motor|car|scheme|brand|model|engine|chassis|asset|commodity|hàng hóa|phương tiện/i.test(entry.searchablePath));
  const contractFileCode = tab === "customer" ? getContractFileCode(details) : "";
  const customerImages = contractFileCode
    ? `<div class="customer-image-grid">${[
      ["nationalFrontside", "Ảnh mặt trước CCCD"],
      ["nationalBackside", "Ảnh mặt sau CCCD"],
      ["personal", "Ảnh khách hàng"]
    ].map(([kind, label]) => `<div class="contract-detail-image-field customer-photo-field"><strong>${label}</strong><img data-contract-image-id="${escapeHtml(contractFileCode)}" data-contract-image-kind="${kind}" alt="${label}" loading="lazy" hidden /><span class="contract-image-loading">Đang tải ảnh...</span><span class="contract-image-error" hidden></span></div>`).join("")}</div>`
    : '<p class="contract-detail-empty">Không tìm thấy mã hồ sơ HPO để tải ảnh khách hàng.</p>';
  return `<section class="detail-tab-section"><h3>${detailTabDefinitions.find(([key]) => key === tab)?.[1] || "Thông tin hợp đồng"}</h3>${renderDetailFields(relevantEntries, tab === "customer" ? "API chưa trả về thông tin khách hàng trong mục customer." : "API chưa trả về thông tin cho mục này.")}${tab === "customer" ? customerImages : ""}</section>`;
}

export function renderContractDetailTabs(activeTab) {
  return detailTabDefinitions.map(([key, label]) => `<button class="contract-detail-tab${activeTab === key ? " active" : ""}" type="button" data-detail-tab="${key}" aria-selected="${activeTab === key}">${label}</button>`).join("");
}
