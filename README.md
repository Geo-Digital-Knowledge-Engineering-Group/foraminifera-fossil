<img width="1146" height="936" alt="image" src="https://github.com/user-attachments/assets/b675f4ba-3449-4fb2-b5ac-e23c344ab1df" />
v2
<img width="1070" height="740" alt="image" src="https://github.com/user-attachments/assets/4f13fd5d-1faf-44cc-bebf-a4d75273fe89" />

The project is designed around the following principles:

- Keep the folder structure simple and predictable.
- Avoid unnecessary UI frameworks and abstraction layers.
- Use plain CSS for easier visual customization.
- Separate page styles from component styles.
- Keep API responsibilities separated into routes, controllers, services, and models.
- Make responsive behavior easy to locate and understand.
- Store reusable visual assets in a dedicated assets directory.
- Use `-jr` comments for code sections that are especially useful for junior developers to study.

## Current Project Structure

```text
foraminifera-fossil/
|
|-- api/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |   `-- healthController.js
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |   `-- healthRoutes.js
|   |   |-- services/
|   |   `-- app.js
|   |
|   |-- server.js
|   |-- package.json
|   `-- package-lock.json
|
|-- client/
|   |-- public/
|   |   `-- index.html
|   |
|   |-- src/
|   |   |-- assets/
|   |   |   `-- images/
|   |   |       `-- logo.png
|   |   |
|   |   |-- components/
|   |   |   |-- Footer.js
|   |   |   `-- Navbar.js
|   |   |
|   |   |-- pages/
|   |   |   `-- Home.js
|   |   |
|   |   |-- styles/
|   |   |   |-- components/
|   |   |   |   |-- footer.css
|   |   |   |   `-- navbar.css
|   |   |   |
|   |   |   |-- pages/
|   |   |   |   `-- home.css
|   |   |   |
|   |   |   |-- global.css
|   |   |   `-- variables.css
|   |   |
|   |   |-- App.js
|   |   `-- index.js
|   |
|   |-- babel.config.json
|   |-- webpack.config.js
|   |-- package.json
|   `-- package-lock.json
|
`-- README.md
```

## Frontend

The frontend is built with:

- React
- React DOM
- JavaScript
- Webpack
- Babel
- Plain CSS

TypeScript is not used.

Vite is not used.

The frontend build process is configured manually with Webpack and Babel so the project structure remains visible and understandable.

## Frontend Entry Flow

```text
public/index.html
        |
        v
src/index.js
        |
        v
src/App.js
        |
        +-- Navbar
        |
        +-- Home
        |
        `-- Footer
```

`public/index.html` contains the root HTML document and the React root element.

```html
<div id="root"></div>
```

`src/index.js` connects React to the browser DOM and renders the main `App` component.

```text
index.js
   |
   +-- React DOM
   +-- App
   `-- Global Styles
```

## Frontend Styling Structure

Styles are separated by responsibility.

```text
styles/
|-- global.css
|-- variables.css
|-- components/
|   |-- navbar.css
|   `-- footer.css
`-- pages/
    `-- home.css
```

### `global.css`

Contains application-wide browser and layout rules.

Examples:

- `box-sizing`
- body reset
- default font
- root layout
- shared image behavior

### `variables.css`

Contains reusable CSS variables.

Example:

```css
:root {
  --color-background: #f4f4f4;
  --color-surface: #ffffff;
  --color-text: #222222;
  --color-text-muted: #666666;
  --color-border: #cccccc;
  --color-primary: #355f5b;

  --page-max-width: 1200px;

  --spacing-small: 8px;
  --spacing-medium: 16px;
  --spacing-large: 24px;
}
```

This allows global visual changes without searching through every stylesheet.

### Component Styles

Reusable components have their own CSS files.

```text
Navbar.js
navbar.css

Footer.js
footer.css
```

### Page Styles

Each page can have its own stylesheet.

```text
Home.js
home.css
```

This keeps page-specific styles out of the global stylesheet.

## Asset Structure

Reusable visual files are stored in:

```text
src/assets/
```

Images are currently stored in:

```text
src/assets/images/
```

Example:

```text
src/assets/images/logo.png
```

The navbar logo is imported directly into the React component.

```javascript
import logo from "../assets/images/logo.png";
```

The imported asset is then used in JSX.

```javascript
<img
  className="navbar-logo"
  src={logo}
  alt="GeoKnow"
/>
```

Webpack is configured to process common image formats with Asset Modules.

```javascript
{
  test: /\.(png|jpg|jpeg|gif|svg)$/i,
  type: "asset/resource",
}
```

This keeps image files inside the frontend source structure and allows Webpack to include them in the build output.

## Responsive Design

The initial template is responsive.

The navigation bar uses a desktop menu on larger screens and a toggle menu on smaller screens.

Desktop:

```text
[Logo]        Home About Geology Fossils
```

Mobile:

```text
[Logo]        Menu Button
```

The mobile menu is controlled by React state.

```text
User clicks menu button
        |
        v
toggleMenu()
        |
        v
isMenuOpen changes
        |
        v
navbar-menu-open class is added or removed
        |
        v
CSS changes menu visibility
```

Page layouts use CSS media queries.

Example:

```css
@media (max-width: 768px) {
  .home-information {
    grid-template-columns: 1fr;
  }
}
```

The home information area uses three columns on desktop and one column on mobile.

Responsive layout behavior is handled with CSS when the change is purely visual.

React state is used when user interaction is required.

## Junior Developer Notes

Code sections that are particularly useful for junior developers are marked with the `-jr` tag.

JavaScript example:

```javascript
// -jr Mobile navigation open/close state
```

CSS example:

```css
/* -jr Three desktop columns become one mobile column */
```

The purpose of these comments is to make important state, layout, and responsive behavior easier to locate and study.

## Home Page

The current home page contains a short introduction to foraminifera and their geological importance.

Current sections:

- Foraminifera and Geology
- What are Foraminifera?
- Geological Importance
- Fossil Data

The page currently explains that foraminifera are microscopic marine organisms whose shells can be preserved in sediment and the fossil record.

It also introduces their use in geological age interpretation, paleoenvironmental studies, water-depth analysis, and climate research.

## Navbar

The current navbar contains:

- Logo
- Home
- About
- Geology
- Fossils

The navigation is responsive and includes a mobile toggle menu.

The logo is loaded from:

```text
src/assets/images/logo.png
```

## Footer

The footer contains:

- Project title
- Short project description
- Navigation links
- Automatic current year
- Copyright information

The year is generated dynamically.

```javascript
const currentYear = new Date().getFullYear();
```

The application layout also keeps the footer at the bottom of the viewport when page content is short.

## Backend

The backend is built with:

- Node.js
- Express.js
- Nodemon for development

The API is structured to separate HTTP routing from controller logic.

Current backend flow:

```text
HTTP Request
     |
     v
Route
     |
     v
Controller
     |
     v
Service
     |
     v
Model / Database
```

The `services` and `models` directories are currently prepared for future domain and database logic.

## API Entry Flow

```text
server.js
    |
    v
src/app.js
    |
    v
routes
    |
    v
controllers
```

### `server.js`

Responsible only for starting the HTTP server.

```text
Load application
        |
        v
Open port
        |
        v
Start server
```

### `src/app.js`

Responsible for Express application configuration.

Current responsibilities:

- Create the Express application
- Enable JSON request parsing
- Mount API routes

### Routes

Routes define:

- HTTP method
- URL
- Controller

Example:

```javascript
router.get("/", getHealth);
```

Business logic should not be placed directly inside route files.

### Controllers

Controllers handle the HTTP request and response layer.

The current health controller returns a JSON response with HTTP status `200`.

## Current API Endpoint

### Health Check

```http
GET /api/health
```

Development URL:

```text
http://localhost:5000/api/health
```

Example response:

```json
{
  "status": "ok",
  "message": "Foraminifera Fossil API is running."
}
```

Request flow:

```text
GET /api/health
        |
        v
src/app.js
        |
        v
healthRoutes.js
        |
        v
healthController.js
        |
        v
200 JSON Response
```

## Installation

Clone the repository:

```bash
git clone https://github.com/datkanber/foraminifera-fossil.git
```

Open the project directory:

```bash
cd foraminifera-fossil
```

## Run the Frontend

Open the client directory:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

The frontend runs at:

```text
http://localhost:3000
```

Create a production build:

```bash
npm run build
```

## Run the API

Open a second terminal and enter the API directory:

```bash
cd api
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

Start the API without Nodemon:

```bash
npm start
```

## Development Scripts

### Client

```bash
npm start
```

Starts the Webpack development server.

```bash
npm run build
```

Creates a production build.

### API

```bash
npm run dev
```

Starts the Express API with Nodemon.

```bash
npm start
```

Starts the Express API with Node.js.

## Current Development Status

Completed:

- Repository structure
- React setup without Vite
- JavaScript-only frontend
- Manual Webpack configuration
- Babel configuration
- Global CSS structure
- CSS variables
- Dedicated assets structure
- Webpack image asset configuration
- Navbar logo integration
- Responsive navbar
- Mobile navigation toggle
- Home page
- Responsive home information grid
- Footer
- Sticky footer layout
- Express.js API setup
- Modular API routing
- Health controller
- Health check endpoint

## Planned Next Steps

The next development steps are expected to include:

1. Central API `404` handling.
2. Central Express error middleware.
3. CORS configuration.
4. Frontend and API connection.
5. Fossil and taxon API structure.
6. Service-layer implementation.
7. Database configuration.
8. Neo4j integration.
9. Foraminifera sample and taxonomy data modeling.
10. Additional pages and data views.

## Development Philosophy

This repository intentionally avoids unnecessary complexity.

The project does not currently use:

- TypeScript
- Vite
- Tailwind CSS
- Bootstrap
- Material UI
- CSS-in-JS
- CSS Modules

The current approach is based on:

```text
React
+
Plain JavaScript
+
Webpack
+
Babel
+
Plain CSS
+
Express.js
```

The main priority is maintainability, explicit structure, and easy modification by developers with different experience levels.

## License

This project currently uses the ISC license configuration defined in the generated `package.json` files.

### Dependencies
To run this project, make sure you have the following packages installed:
* TensorFlow
* OpenCV
* NumPy
* Matplotlib
