import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8080/api-gateway/",
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.data?.error) {
      // Se o backend enviou uma mensagem de erro específica, usa-a
      const customError = new Error(error.response.data.error);
      (customError as any).status = error.response.status;
      (customError as any).originalError = error;
      return Promise.reject(customError);
    } else if (error.response?.status === 403) {
      // Para erros 403 sem mensagem específica, usa "Permission Denied"
      const customError = new Error("Permission Denied");
      (customError as any).status = 403;
      (customError as any).originalError = error;
      return Promise.reject(customError);
    } else if (error.response?.status === 404) {
      // Para erros 404
      const customError = new Error("Resource not found");
      (customError as any).status = 404;
      (customError as any).originalError = error;
      return Promise.reject(customError);
    } else if (error.response?.status === 401) {
      // Para erros 401
      const customError = new Error("Unauthorized - Please login again");
      (customError as any).status = 401;
      (customError as any).originalError = error;
      return Promise.reject(customError);
    } else if (error.response?.status && error.response.status >= 500) {
      // Para erros 5xx
      const customError = new Error("Server error - Please try again later");
      (customError as any).status = error.response.status;
      (customError as any).originalError = error;
      return Promise.reject(customError);
    }
    
    return Promise.reject(error);
  }
);
