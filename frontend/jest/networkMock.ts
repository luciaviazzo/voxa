import { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import apiClient from '@/services/api';

export type FakeReply = { status: number; data?: unknown } | 'network-error';

export function mockBackend(reply: FakeReply) {
  const calls: AxiosRequestConfig[] = [];

  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push(config);
    if (reply === 'network-error') {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
    }
    const response = {
      status: reply.status,
      statusText: '',
      data: reply.data,
      headers: {},
      config,
    } as AxiosResponse;
    if (reply.status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, response);
    }
    return response;
  };

  return calls;
}
