import { CONTRACT_PAGE_SIZE } from "./api.js";

export const statusLabels = {
  waiting: "Chờ bổ sung",
  approved: "Đã phê duyệt",
  review: "Đang xử lý",
  rejected: "Từ chối"
};

export function isPendingApprovalContract(contract) {
  const status = String(contract?.statusLabel || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLocaleLowerCase("vi")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /(?:cho(?:\s+khach)?|pending|waiting|wait)\s+(?:phe\s+duyet|duyet|approval|approve)|(?:phe\s+duyet|duyet|approval|approve)\s+(?:dang\s+)?(?:cho|pending|waiting|wait)/.test(status);
}

export const productIcons = {
  "Vay tiền mặt": "wallet",
  "Vay mua xe": "car",
  "Vay thẻ tín dụng": "card"
};

const contractTypes = {
  DL: "Vay tiền mặt",
  CL: "Vay tiền mặt",
  "2W": "Vay mua xe",
  CD: "Vay thẻ tín dụng",
  PR_CARD_SI: "Vay thẻ tín dụng"
};

const contractStatuses = {
  ADDITIONAL_INFO: { label: "Chờ khách bổ sung thông tin", status: "waiting" },
  REJECT_STATUS: { label: "Từ chối phê duyệt", status: "rejected" },
  APPROVE_DISBURSEMENT_STATUS: { label: "Đã phê duyệt giải ngân", status: "approved" },
  APPROVE_STATUS: { label: "Đã phê duyệt", status: "approved" }
};

export const demoContracts = [
  { id: "HPO-857E-1792320635", customer: "Nguyễn Ngọc Trúng", product: "Vay tiền mặt", status: "waiting", statusLabel: statusLabels.waiting, created: "18/10/2026 17:51", amount: "20.000.000" },
  { id: "HPO-B225-1792226259", customer: "Đặng Thị Ngọc", product: "Vay mua xe", status: "rejected", statusLabel: statusLabels.rejected, created: "17/10/2026 15:38", amount: "35.000.000" },
  { id: "HPO-B4CC-1792223725", customer: "Bùi Anh Tuấn", product: "Vay tiền mặt", status: "rejected", statusLabel: statusLabels.rejected, created: "17/10/2026 14:56", amount: "15.000.000" },
  { id: "HPO-4A31-1792139834", customer: "Lê Minh Phương", product: "Vay thẻ tín dụng", status: "approved", statusLabel: statusLabels.approved, created: "16/10/2026 11:24", amount: "50.000.000" },
  { id: "HPO-95C2-1792054741", customer: "Phạm Hoàng Long", product: "Vay tiền mặt", status: "review", statusLabel: statusLabels.review, created: "15/10/2026 16:09", amount: "25.000.000" },
  { id: "HPO-DC10-1791972168", customer: "Trần Thị Mai", product: "Vay mua xe", status: "waiting", statusLabel: statusLabels.waiting, created: "14/10/2026 09:42", amount: "42.000.000" },
  { id: "HPO-2E78-1791884560", customer: "Võ Thanh Bình", product: "Vay tiền mặt", status: "approved", statusLabel: statusLabels.approved, created: "13/10/2026 13:17", amount: "18.000.000" },
  { id: "HPO-7F16-1791790932", customer: "Hoàng Mỹ Linh", product: "Vay thẻ tín dụng", status: "review", statusLabel: statusLabels.review, created: "12/10/2026 10:06", amount: "30.000.000" }
];

function firstValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source && source[key];
    if (value != null && value !== "") {
      if (typeof value === "object") {
        const nested = firstValue(value, ["name", "fullName", "displayName", "value", "code"]);
        if (nested) return nested;
      } else {
        return String(value);
      }
    }
  }
  return fallback;
}

function formatContractDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function getContractNumber(record) {
  return firstValue(record, [
    "number",
    "contractNumber",
    "contract_number",
    "contractNo",
    "contract_no"
  ]);
}

export function getContractFileCode(details) {
  const preferredFields = new Set(["code", "contractcode", "contractid", "hpoid"]);
  let preferredCode = "";
  let fallbackCode = "";
  const pending = [{ value: details, depth: 0 }];
  while (pending.length) {
    const { value, depth } = pending.pop();
    if (!value || typeof value !== "object" || depth > 6) continue;
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string" && /^HPO-[A-Z0-9-]+$/i.test(child.trim())) {
        if (preferredFields.has(key.replace(/[_-]/g, "").toLocaleLowerCase("en"))) {
          preferredCode = child.trim();
        } else {
          fallbackCode = child.trim();
        }
      } else if (child && typeof child === "object") {
        pending.push({ value: child, depth: depth + 1 });
      }
    }
  }
  return preferredCode || fallbackCode;
}

export function normalizeContract(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Dữ liệu hợp đồng trả về không đúng định dạng.");
  }
  const number = getContractNumber(record);
  const id = firstValue(record, ["id", "contractId", "contract_id", "code"], number || "—");
  const customerDetails = record.customer && typeof record.customer === "object" ? record.customer : null;
  const customerName = customerDetails
    ? [customerDetails.lastName, customerDetails.middleName, customerDetails.firstName].filter(Boolean).join(" ")
    : "";
  const customer = firstValue(record, ["customerName", "customerFullName", "fullName", "borrowerName", "name"], customerName || "Chưa có tên khách hàng");
  const typeCode = firstValue(record, ["type", "contractType", "typeCode"]).toUpperCase();
  const product = firstValue(record, ["productName", "loanProductName", "contractTypeName", "productTypeName", "businessLineName", "product", "businessLine"], contractTypes[typeCode] || "Hợp đồng vay");
  const rawStatus = firstValue(record, ["statusName", "statusDescription", "contractStatusName", "contractStatus", "stageName", "phaseName", "status", "statusCode"], "Chưa xác định");
  const mappedStatus = contractStatuses[rawStatus.toUpperCase()];
  const statusText = rawStatus.toLocaleLowerCase("vi");
  let status = mappedStatus ? mappedStatus.status : "review";
  if (!mappedStatus && /reject|declin|từ chối|tu choi/.test(statusText)) status = "rejected";
  else if (!mappedStatus && /approv|approved|phê duyệt|phe duyet|giải ngân thành công/.test(statusText)) status = "approved";
  else if (!mappedStatus && /submit|supplement|additional|waiting|pending|bổ sung|bo sung|not submit|chờ khách|cho khach/.test(statusText)) status = "waiting";
  return {
    id: id || "—",
    number,
    customer,
    product,
    status,
    statusLabel: mappedStatus ? mappedStatus.label : rawStatus.replaceAll("_", " "),
    created: formatContractDate(firstValue(record, ["createdDate", "created_date", "createdAt", "createDate", "dateCreated", "created"], "—"))
  };
}

export function extractContractPage(payload) {
  const pageData = Array.isArray(payload) ? { content: payload }
    : payload && payload.data && typeof payload.data === "object" && Array.isArray(payload.data.content)
      ? { ...payload, ...payload.data }
      : payload;
  if (!pageData || typeof pageData !== "object") {
    throw new Error("Máy chủ trả về danh sách hợp đồng không đúng định dạng.");
  }
  const data = Array.isArray(pageData.contracts) ? pageData.contracts
    : Array.isArray(pageData.content) ? pageData.content
      : Array.isArray(pageData.data) ? pageData.data
        : Array.isArray(pageData.result) ? pageData.result
          : pageData.data && Array.isArray(pageData.data.content) ? pageData.data.content
            : Array.isArray(pageData.items) ? pageData.items
              : null;
  if (!data) throw new Error("Không tìm thấy danh sách hợp đồng trong phản hồi API.");
  const totalElements = Number(pageData.totalItems ?? pageData.totalElements ?? pageData.totalCount ?? pageData.total ?? data.length);
  const totalPages = Number(pageData.totalPages ?? Math.ceil(totalElements / CONTRACT_PAGE_SIZE) ?? 1);
  return {
    contracts: data.map(normalizeContract),
    totalElements: Number.isFinite(totalElements) && totalElements >= 0 ? totalElements : data.length,
    totalPages: Number.isFinite(totalPages) && totalPages >= 0 ? totalPages : 1,
    currentPage: Number.isFinite(Number(pageData.currentPage)) ? Number(pageData.currentPage) : 0
  };
}

export function extractContractDetails(payload) {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      throw new Error("API chưa trả về thông tin chi tiết cho hợp đồng này.");
    }
    return payload.length === 1 && payload[0] && typeof payload[0] === "object"
      ? payload[0]
      : payload;
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("API chưa trả về dữ liệu chi tiết hợp đồng ở định dạng JSON.");
  }
  const details = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? payload.data
    : payload.contract && typeof payload.contract === "object" && !Array.isArray(payload.contract)
      ? payload.contract
      : payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
        ? payload.result
        : payload;
  if (!Object.keys(details).length) {
    throw new Error("Không tìm thấy thông tin chi tiết hợp đồng trong phản hồi API.");
  }
  return details;
}
