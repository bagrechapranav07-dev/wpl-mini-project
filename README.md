# TechNest Laptop Store

TechNest is a multi-page laptop storefront project with product browsing, accessories, a shopping cart, checkout, repair services, contact forms, and an admin interface.

## Run the website

The storefront is made of static HTML, CSS, and JavaScript files. From the project root, start a local web server or open `index.html` in a browser.

For example, if Python is installed:

```powershell
py -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000). To stop the server, press `Ctrl+C` in the terminal.

## Project structure

- `index.html`, `laptops.html`, `accessories.html`, and other root HTML files are the website pages.
- `css/style.css` contains the shared styles.
- `js/` contains the storefront, cart, product data, and admin scripts.
- `images/` contains local image assets.
- `backend/models/` contains Mongoose schemas, and `backend/config/db.js` contains the MongoDB connection helper.

## Backend notes

The backend folder currently contains database configuration and model definitions. It does not include a `server.js` application entry point, so the `npm start` script is not runnable yet.

The example MongoDB URI is in `backend/.env.example`. If you add a backend server, copy this file to `backend/.env` and set `MONGODB_URI` to your MongoDB connection string. Do not commit real credentials.
