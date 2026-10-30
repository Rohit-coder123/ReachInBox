import { Client } from '@elastic/elasticsearch';
import { config } from './index';
import { logger } from '../utils/logger';

export const esClient = new Client({
  node: config.elasticsearch.node,
  auth:
    config.elasticsearch.username && config.elasticsearch.password
      ? {
          username: config.elasticsearch.username,
          password: config.elasticsearch.password,
        }
      : undefined,
  maxRetries: 3,
  requestTimeout: 10000,
});

export const checkElasticsearchHealth = async (): Promise<boolean> => {
  try {
    const health = await esClient.cluster.health();
    logger.info(`✅ Elasticsearch cluster connected (status: ${health.status})`);
    return true;
  } catch (error: any) {
    logger.warn(`⚠️ Elasticsearch not reachable at ${config.elasticsearch.node} (${error.message}). Graceful fallback enabled.`);
    return false;
  }
};

export default esClient;
