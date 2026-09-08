import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import About from "./pages/About";
import Geology from "./pages/Geology";
import Fossils from "./pages/Fossils";
import Contact from "./pages/Contact";
import Vlm from "./pages/Vlm";

import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />

        <div style={{ flex: 1, paddingBottom: "20px" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/tani" replace />} />
            <Route path="/tani" element={<Fossils />} />
            <Route path="/vlm" element={<Vlm />} />
            <Route path="/hakkinda" element={<About />} />
            <Route path="/jeoloji" element={<Geology />} />
            <Route path="/iletisim" element={<Contact />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;