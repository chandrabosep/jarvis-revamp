import axios from "axios";

const axiosInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
		"x-api-key": process.env.NEXT_PUBLIC_X_API_KEY,
	},
});

// Request interceptor
axiosInstance.interceptors.request.use(
	(config) => {
		console.log(`Making request to: ${config.url}`);
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor
axiosInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error);
	}
);

export default axiosInstance;
