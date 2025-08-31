// api.js
import axios from "axios";

// API for app server
const API = axios.create({
  baseURL: "http://localhost:10001",
});

// API for oracle price server
const OraclePriceAPI = axios.create({
  baseURL: "http://localhost:7001",
});

// Export both
export { API, OraclePriceAPI };

// Optionally: make one default
export default API;