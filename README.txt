
Smart Assessment - Fullstack Demo (Tiếng Việt)
---------------------------------------------
Thư mục:
- frontend/: React app (demo, cần node + react-scripts)
- backend/: FastAPI demo (API stub để sinh câu hỏi, lưu kết quả)

Chạy local (gợi ý):
1. Backend:
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

2. Frontend:
   cd frontend
   npm install
   npm start
   -> Sửa proxy trong package.json hoặc chạy frontend trên port 3000 và gọi API backend tại http://localhost:8000/api/...

OpenAI:
- Để tích hợp OpenAI thực tế, triển khai một endpoint server-side (ví dụ trong backend/main.py) dùng secret OPENAI_API_KEY.
- Backend gọi API OpenAI, parse kết quả thành JSON kiểu: { title, questions: [{id,text,choices,answer}] } và trả về cho frontend.

Đóng gói:
- File .zip (smart-assessment.zip) có toàn bộ project để tải xuống.

---
Mở rộng: Tích hợp OpenAI + Firebase Auth
1) OpenAI
 - Đăng ký API key tại OpenAI, gán vào biến môi trường OPENAI_API_KEY
 - Backend đã có ví dụ gọi ChatCompletion và parse JSON trả về
2) Firebase Auth
 - Tạo project Firebase, tạo Service Account (Admin SDK) -> tải file JSON
 - Cung cấp nội dung JSON vào biến FIREBASE_SERVICE_ACCOUNT_JSON (hoặc đường dẫn file)
 - Frontend dùng Firebase client SDK để đăng nhập (Google/Firebase email) và gửi ID token (Authorization: Bearer <idToken>) khi gọi API bảo vệ

Triển khai nhanh trên Render:
 - Push repository lên GitHub
 - Tạo new Web Service trên Render, chọn repo, branch
 - Thêm env vars: OPENAI_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON
 - Build command: pip install -r requirements.txt
 - Start command: uvicorn main:app --host 0.0.0.0 --port $PORT

Triển khai trên Vercel (Docker):
 - Push repo
 - Tạo project trên Vercel, connect repo
 - Thêm env vars tương tự
 - Vercel sẽ build Dockerfile

---
### 🚀 Tự động deploy Render bằng GitHub Actions

1. Tạo repository GitHub và push toàn bộ project này lên.
2. Trên GitHub, vào **Settings → Secrets → Actions**, thêm:
   - `RENDER_API_KEY`: lấy tại https://render.com/u -> Account -> API Keys
   - `RENDER_SERVICE_ID`: vào trang service Render -> Settings -> Deploy Hook -> copy ID.
3. Mỗi lần bạn **push lên nhánh `main`**, GitHub sẽ:
   - Kiểm tra lỗi Python
   - Gọi API Render để tự động deploy backend
4. Kiểm tra tiến trình deploy tại: https://dashboard.render.com/
