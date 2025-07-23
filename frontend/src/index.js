import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Web3Provider } from "./context/Web3Context";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Web3Provider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Web3Provider>
);