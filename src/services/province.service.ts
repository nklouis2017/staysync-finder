import axiosInstance from './index';

export interface ListProvinceRequest {
  keyword: string;
}

export interface ListWardRequest {
  keyword: string;
  provinceCode: string;
}

export interface GetProvinceByCodeRequest {
  code: string;
}

export interface ProvinceItem {
  code: string;
  name: string;
  nameEn: string;
  aptCount?: number;
}

export interface WardItem {
  code: string;
  name: string;
  nameEn: string;
  provinceCode: string;
  aptCount?: number;
}

/**
 * Format tên hiển thị cho province/ward trong dropdown:
 * - Có aptCount > 0  → "Tên (count)"
 * - Không/0          → "Tên"
 * Khi dùng cho query tìm kiếm (Nominatim, etc.) → chỉ dùng `name`.
 */
export const formatLocationLabel = (item: { name: string; aptCount?: number }) => {
  const count = item.aptCount ?? 0;
  return count > 0 ? `${item.name} (${count})` : item.name;
};

const provinceService = {
  listProvince: (request: ListProvinceRequest) => {
    return axiosInstance.post('/Province/get-list-province', request);
  },

  listWard: (request: ListWardRequest) => {
    return axiosInstance.post('/Province/get-list-ward', request);
  },

  getProvinceByCode: (request: GetProvinceByCodeRequest) => {
    return axiosInstance.post('/Province/get-province-by-code', request);
  },
};

export default provinceService;
