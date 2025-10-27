Đăng nhập/Đăng ký (gợi ý triển khai)
- Frontend: dùng Firebase Authentication (Google, email/password) hoặc OAuth2 với Google.
- Backend: nếu dùng Firebase Auth, gửi ID token từ frontend tới backend và verify token.
- Nếu dùng JWT: backend cung cấp /auth/login để kiểm tra cred và trả access token.
- Tài liệu tham khảo:
  - Firebase Authentication (email + Google): https://firebase.google.com/docs/auth
  - Google OAuth: https://developers.google.com/identity/protocols/oauth2
