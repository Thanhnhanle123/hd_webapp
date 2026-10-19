const API_BASE_URL = "https://hpo.hdsaison.com.vn/hpo/api/v1";
export const CONTRACT_PAGE_SIZE = 10;

export class ApiSessionError extends Error {}

async function readJsonResponse(response) {
  const bodyText = await response.text();
  let payload = null;
  if (bodyText) {
    try {
      payload = JSON.parse(bodyText);
    } catch {
      throw new Error("Máy chủ trả về dữ liệu không đúng định dạng JSON.");
    }
  }
  if (!response.ok) {
    const message = payload && (payload.message || payload.error);
    throw new Error(message ? String(message) : `Máy chủ từ chối yêu cầu (HTTP ${response.status}).`);
  }
  return payload;
}

export function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
}

export async function signIn(username, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const user = await readJsonResponse(response);
  if (!user || typeof user !== "object" || !user.accessToken) {
    throw new Error("Máy chủ đăng nhập không trả về thông tin phiên hợp lệ.");
  }
  return user;
}

export async function requestApi(path, session, options = {}) {
  if (!session || session.expiresAt <= Date.now()) {
    throw new ApiSessionError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
      Authorization: `${session.tokenType || "Bearer"} ${session.accessToken}`
    }
  });
  if (response.status === 401) {
    throw new ApiSessionError("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
  }
  return readJsonResponse(response);
}

export async function getDashboardStatistics(session) {
  return requestApi(`/dashboard/statistic/sale/${encodeURIComponent(session.id)}`, session);
}

export async function getSettings(session) {
  return requestApi("/settings", session);
}

export async function getCreatedContracts(session, { page = 0, contractNumber = "" } = {}) {
  const parameters = new URLSearchParams({
    page: String(page),
    size: String(CONTRACT_PAGE_SIZE),
    sort: "created_date,desc",
    statusCodes: "",
    fromDate: "01-01-1900",
    toDate: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh"
    }).format(new Date()).replaceAll("/", "-"),
    contractNumber
  });
  return requestApi(
    `/contracts/usercreated/${encodeURIComponent(session.id)}?${parameters.toString()}`,
    session
  );
}

export async function getContractDetails(session, contractNumber) {
  return requestApi(`/contracts/contractnumber/${encodeURIComponent(contractNumber)}`, session);
}

export async function getUploadedImage(session, imageId) {
  return getImage(session, `/uploadimages/${encodeURIComponent(imageId)}`);
}

export async function getCustomerImage(session, contractFileCode, imageKind = "personal") {
  const contractCode = String(contractFileCode || "").trim();
  if (!/^HPO-[A-Z0-9-]+$/i.test(contractCode)) {
    throw new Error("Không tìm thấy mã HPO để tải ảnh khách hàng.");
  }
  const imagePath = {
    personal: "personal/0.jpeg",
    nationalFrontside: "national/0.jpeg",
    nationalBackside: "national/1.jpeg"
  }[imageKind];
  if (!imagePath) throw new Error("Loại ảnh khách hàng không hợp lệ.");
  return getImage(session, `/downloadfile/${encodeURIComponent(contractCode)}/0/${imagePath}`);
}

async function getImage(session, path) {
  if (!session || session.expiresAt <= Date.now()) {
    throw new ApiSessionError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "image/*, application/octet-stream",
      Authorization: `${session.tokenType || "Bearer"} ${session.accessToken}`
    }
  });
  if (response.status === 401) {
    throw new ApiSessionError("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
  }
  if (!response.ok) {
    throw new Error(`Không tải được hình ảnh (HTTP ${response.status}).`);
  }
  const image = await response.blob();
  if (!image.size) throw new Error("Máy chủ trả về hình ảnh rỗng.");
  const imageType = await detectImageType(image);
  if (!imageType) {
    throw new Error("Không nhận dạng được định dạng ảnh máy chủ trả về.");
  }
  return image.type === imageType ? image : image.slice(0, image.size, imageType);
}

async function detectImageType(image) {
  const bytes = new Uint8Array(await image.slice(0, 12).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46
    && bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00)
    || (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)) return "image/tiff";
  if (image.type.startsWith("image/")) return image.type;
  return "";
}

export async function synchronizeContractStatus(session, contractNumber) {
  const parameters = new URLSearchParams({ contractNumber });
  return requestApi(`/sync-update-status?${parameters.toString()}`, session, { method: "PUT" });
}
