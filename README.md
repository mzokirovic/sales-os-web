# Sales OS Web

Admin web app for Sales OS.

Stack:
- Next.js
- React
- TypeScript
- Tailwind CSS

Local web URL:
http://localhost:3001

Backend URL:
http://localhost:3000

Start web:
cd ~/Documents/sales-os/web
npm install
npm run dev -- -p 3001

Environment file:
.env.local

Required env:
NEXT_PUBLIC_API_URL="http://localhost:3000"

Test users:

OWNER:
+998901112233
123456

SALES:
+998901234567
123456

Main pages:
- /login
- /dashboard
- /orders
- /products
- /customers
- /employees

Smoke checklist:
docs/WEB_SMOKE_TEST.md

Before changing UI:
1. Check that backend is running.
2. Check that .env.local points to backend.
3. Test OWNER login.
4. Test SALES login.
5. Test order creation.
6. Run through docs/WEB_SMOKE_TEST.md.
