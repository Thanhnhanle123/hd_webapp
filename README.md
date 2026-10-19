# HDSAISON Portal

## Chạy ứng dụng

Mở thư mục này bằng VS Code và chạy `index.html` qua một HTTP server, chẳng hạn extension Live Server. Ứng dụng dùng ES modules nên không chạy đầy đủ khi mở trực tiếp bằng `file://`.

## Cấu trúc mã nguồn

- `src/api.js`: đăng nhập và các yêu cầu tới HDSAISON API.
- `src/contracts.js`: dữ liệu hợp đồng mẫu, chuẩn hóa phản hồi và ánh xạ trạng thái.
- `src/ui.js`: render thống kê, hợp đồng và icon.
- `src/main.js`: khởi tạo giao diện, quản lý phiên và nối sự kiện.

## Đồng bộ hợp đồng

Có thể đồng bộ thủ công các hợp đồng chưa được phê duyệt hoặc từ chối bằng nút trong dòng tương ứng. Hồ sơ đã phê duyệt hoặc bị từ chối không cần đồng bộ và nút sẽ bị vô hiệu hóa. Khi một hồ sơ đang được đồng bộ, thời gian đã chạy hiển thị cạnh nút đồng bộ và cập nhật mỗi giây. Khi đã đăng nhập, ứng dụng tải lại danh sách trên trang hiện tại mỗi 2 phút và chỉ gọi API đồng bộ cho các hợp đồng có trạng thái chờ phê duyệt; chu kỳ tạm dừng khi tab bị ẩn. Sau khi đồng bộ thành công, danh sách được tải lại để hiển thị trạng thái mới. Đây là polling, không phải cập nhật tức thời từ máy chủ; realtime thực sự cần API push như WebSocket hoặc SSE.

Nhấn tên khách hàng hoặc nút xem ở dòng hợp đồng để tải chi tiết từ `GET /contracts/contractnumber/{number}`. API chi tiết và đồng bộ dùng trường `number`/`contractNumber` từ hợp đồng, không dùng ID nội bộ. Màn hình chi tiết có các tab theo dõi hợp đồng, thông tin khách hàng, hàng hóa, chứng từ và bộ hợp đồng; các trường hiển thị lấy từ phản hồi API. Nút chi tiết và đồng bộ sẽ không khả dụng nếu hồ sơ chưa có số hợp đồng.

Ảnh khách hàng được tải bằng mã hồ sơ HPO từ `GET /downloadfile/{hpoCode}/0/personal/0.jpeg`; ảnh CCCD hai mặt lần lượt từ `GET /downloadfile/{hpoCode}/0/national/0.jpeg` và `GET /downloadfile/{hpoCode}/0/national/1.jpeg`. Ảnh chứng từ có mã ảnh sẽ được tải riêng từ `GET /uploadimages/{id}`. Cả hai yêu cầu đều gửi access token của phiên đăng nhập.
