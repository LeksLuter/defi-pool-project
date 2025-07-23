@@ .. @@
 import React from "react";
-import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
+import { Routes, Route, useNavigate } from "react-router-dom";
 import Home from "./components/Home";
 import Dashboard from "./components/Dashboard";
 import ConnectWallet from "./components/ConnectWallet";
 import DisconnectWallet from "./components/DisconnectWallet";
 import { useWeb3 } from "./context/Web3Context";
+import "./App.css";

 function App() {
   const { account } = useWeb3();
 }