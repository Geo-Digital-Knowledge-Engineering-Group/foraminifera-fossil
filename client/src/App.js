import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Predict from "./pages/Predict";
import About from "./pages/About";
import Geology from "./pages/Geology";
import Fossils from "./pages/Fossils";
import Contact from "./pages/Contact";

import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />

        <div style={{ flex: 1, paddingBottom: "20px" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/tani" element={<Fossils />} />
            <Route path="/hakkinda" element={<About />} />
            <Route path="/jeoloji" element={<Geology />} />
            <Route path="/iletisim" element={<Contact />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;