import axios from "axios";

// Map to track pending requests
const pendingRequests = new Map();

function getRequestKey(config) {
    return `${config.method}:${config.url}`;
}

// Function to cancel existing request
function cancelPendingRequest(config) {
    const requestKey = getRequestKey(config);
    if (pendingRequests.has(requestKey)) {
        const controller = pendingRequests.get(requestKey);
        controller.abort(); // Cancel the previous request
        pendingRequests.delete(requestKey);
    }
}

const API = axios.create({
    baseURL: "http://localhost:10001",
});

// Attach token automatically
// API.interceptors.request.use((config) => {
//     const state = store.getState(); // Get Redux state
//     const token = state.auth.token; // Get token from Redux store

//     // Cancel duplicate request
//     cancelPendingRequest(config);

//     // Create a new AbortController
//     const controller = new AbortController();
//     config.signal = controller.signal;

//     // Save controller to pendingRequests
//     const requestKey = getRequestKey(config);
//     pendingRequests.set(requestKey, controller);
    
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`; // Attach token
//     }

//     return config;
// }, (error) => Promise.reject(error));


// Remove completed requests from pendingRequests map
API.interceptors.response.use((response) => {
    const requestKey = getRequestKey(response.config);
    pendingRequests.delete(requestKey);
    return response;
}, (error) => {
    if (error.config) {
        const requestKey = getRequestKey(error.config);
        pendingRequests.delete(requestKey);
    }
    return Promise.reject(error);
});


export default API;

