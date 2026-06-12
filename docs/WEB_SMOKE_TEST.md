# Sales OS — Web Smoke Test

## Start

Backend:

cd ~/Documents/sales-os/backend
npm run start:dev

Web:

cd ~/Documents/sales-os/web
npm run dev -- -p 3001

Open:

http://localhost:3001

## OWNER login

Phone:

+998901112233

Password:

123456

Check:

- Dashboard opens
- Products opens
- Customers opens
- Orders opens
- Employees opens
- New order can be created
- Order status button works

## SALES login

Phone:

+998901234567

Password:

123456

Check:

- SALES sees only own customers/orders
- SALES cannot manage employees
- SALES cannot manage products
- SALES can create order
