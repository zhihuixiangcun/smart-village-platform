import { axiosInstance } from './index';

export const uploadApi = {
  uploadImage(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post('/api/v1/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressEvent => {
        if (onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
  },

  uploadFile(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post('/api/v1/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressEvent => {
        if (onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
  },

  uploadChatImage(conversationId, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post(
      `/api/v1/chat/conversations/${conversationId}/upload-image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          if (onUploadProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(progress);
          }
        },
      }
    );
  },

  uploadChatFile(conversationId, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post(
      `/api/v1/chat/conversations/${conversationId}/upload-file`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          if (onUploadProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(progress);
          }
        },
      }
    );
  },
};

export default uploadApi;
