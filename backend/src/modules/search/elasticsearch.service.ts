import { esClient, checkElasticsearchHealth } from '../../config/elasticsearch';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';

export const EMAIL_INDEX = 'reachinbox-emails';

export interface EmailDocument {
  id: string;
  campaignId: string;
  userId?: string;
  recipient: string;
  recipientName?: string | null;
  subject: string;
  sender: string;
  status: string;
  scheduledTime: string;
  sentAt?: string | null;
  createdAt: string;
}

export class ElasticsearchService {
  private isIndexInitialized = false;

  /**
   * Initialize Elasticsearch index with autocomplete edge_ngram analyzers
   */
  async initializeIndex(): Promise<void> {
    if (this.isIndexInitialized) return;

    try {
      const isHealthy = await checkElasticsearchHealth();
      if (!isHealthy) return;

      const exists = await esClient.indices.exists({ index: EMAIL_INDEX });

      if (!exists) {
        await esClient.indices.create({
          index: EMAIL_INDEX,
          body: {
            settings: {
              analysis: {
                filter: {
                  autocomplete_filter: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 20,
                  },
                },
                analyzer: {
                  autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'autocomplete_filter'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                campaignId: { type: 'keyword' },
                userId: { type: 'keyword' },
                recipient: {
                  type: 'text',
                  analyzer: 'autocomplete_analyzer',
                  search_analyzer: 'standard',
                  fields: {
                    raw: { type: 'keyword' },
                  },
                },
                recipientName: { type: 'text' },
                subject: {
                  type: 'text',
                  analyzer: 'autocomplete_analyzer',
                  search_analyzer: 'standard',
                  fields: {
                    raw: { type: 'keyword' },
                  },
                },
                sender: { type: 'keyword' },
                status: { type: 'keyword' },
                scheduledTime: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        logger.info(`✅ Elasticsearch index '${EMAIL_INDEX}' created successfully with autocomplete mappings`);
      }

      this.isIndexInitialized = true;
      await this.syncFromDatabase();
    } catch (error: any) {
      logger.warn(`Failed to initialize Elasticsearch index: ${error.message}`);
    }
  }

  /**
   * Delete single email document
   */
  async deleteEmail(id: string): Promise<void> {
    try {
      await esClient.delete({
        index: EMAIL_INDEX,
        id,
      });
    } catch {
      // Ignore if document not found in ES
    }
  }

  /**
   * Bulk sync all scheduled and sent emails from Postgres into Elasticsearch
   */
  async syncFromDatabase(): Promise<number> {
    try {
      const isHealthy = await checkElasticsearchHealth();
      if (!isHealthy) return 0;

      const emails = await prisma.scheduledEmail.findMany({
        include: {
          campaign: {
            select: { userId: true },
          },
        },
      });

      if (emails.length === 0) return 0;

      const operations = emails.flatMap((e) => [
        { index: { _index: EMAIL_INDEX, _id: e.id } },
        {
          id: e.id,
          campaignId: e.campaignId,
          userId: e.campaign.userId,
          recipient: e.recipientEmail,
          recipientName: e.recipientName,
          subject: e.subject,
          sender: e.senderEmail,
          status: e.status,
          scheduledTime: e.scheduledAt.toISOString(),
          sentAt: e.sentAt ? e.sentAt.toISOString() : null,
          createdAt: e.createdAt.toISOString(),
        },
      ]);

      const bulkResponse = await esClient.bulk({ refresh: true, operations });
      if (bulkResponse.errors) {
        logger.warn('Some errors occurred during Elasticsearch bulk sync');
      } else {
        logger.info(`✅ Successfully synced ${emails.length} emails from PostgreSQL to Elasticsearch`);
      }
      return emails.length;
    } catch (error: any) {
      logger.warn(`Failed to sync from database to Elasticsearch: ${error.message}`);
      return 0;
    }
  }

  /**
   * Index or update single email document
   */
  async indexEmail(doc: EmailDocument): Promise<void> {
    try {
      await esClient.index({
        index: EMAIL_INDEX,
        id: doc.id,
        document: doc,
      });
    } catch (error: any) {
      logger.warn(`Elasticsearch indexing failed for ${doc.id}: ${error.message}`);
    }
  }

  /**
   * Search emails using Elasticsearch with fallback to Postgres
   */
  async searchEmails(params: {
    query?: string;
    status?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const from = (page - 1) * limit;

    try {
      const mustClauses: any[] = [];

      if (params.query) {
        mustClauses.push({
          multi_match: {
            query: params.query,
            fields: ['recipient^3', 'subject^2', 'recipientName', 'sender'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (params.status) {
        mustClauses.push({ term: { status: params.status } });
      }

      if (params.userId) {
        mustClauses.push({ term: { userId: params.userId } });
      }

      const response = await esClient.search({
        index: EMAIL_INDEX,
        from,
        size: limit,
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
        sort: [{ scheduledTime: { order: 'desc' } }],
      });

      const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
      const hits = response.hits.hits.map((hit) => hit._source as EmailDocument);

      return {
        hits,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.warn(`Elasticsearch search query failed, using PostgreSQL fallback: ${error.message}`);

      // Fallback to PostgreSQL Prisma queries
      const where: any = {};
      if (params.query) {
        where.OR = [
          { recipientEmail: { contains: params.query, mode: 'insensitive' } },
          { subject: { contains: params.query, mode: 'insensitive' } },
        ];
      }
      if (params.status) {
        where.status = params.status;
      }
      if (params.userId) {
        where.campaign = { userId: params.userId };
      }

      const [emails, total] = await Promise.all([
        prisma.scheduledEmail.findMany({
          where,
          skip: from,
          take: limit,
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true,
            campaignId: true,
            recipientEmail: true,
            recipientName: true,
            subject: true,
            senderEmail: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
            createdAt: true,
          },
        }),
        prisma.scheduledEmail.count({ where }),
      ]);

      const hits: EmailDocument[] = emails.map((e) => ({
        id: e.id,
        campaignId: e.campaignId,
        recipient: e.recipientEmail,
        recipientName: e.recipientName,
        subject: e.subject,
        sender: e.senderEmail,
        status: e.status,
        scheduledTime: e.scheduledAt.toISOString(),
        sentAt: e.sentAt ? e.sentAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      }));

      return {
        hits,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  }

  /**
   * Instant autocomplete search suggestions
   */
  async autocomplete(prefix: string, userId?: string): Promise<string[]> {
    if (!prefix || prefix.trim().length === 0) return [];

    try {
      const response = await esClient.search({
        index: EMAIL_INDEX,
        size: 8,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: prefix,
                  fields: ['recipient', 'subject'],
                },
              },
              ...(userId ? [{ term: { userId } }] : []),
            ],
          },
        },
      });

      const suggestions = new Set<string>();
      response.hits.hits.forEach((hit) => {
        const source = hit._source as EmailDocument;
        if (source.recipient.toLowerCase().includes(prefix.toLowerCase())) {
          suggestions.add(source.recipient);
        }
        if (source.subject.toLowerCase().includes(prefix.toLowerCase())) {
          suggestions.add(source.subject);
        }
      });

      return Array.from(suggestions).slice(0, 8);
    } catch {
      // Postgres fallback autocomplete
      const matches = await prisma.scheduledEmail.findMany({
        where: {
          OR: [
            { recipientEmail: { startsWith: prefix, mode: 'insensitive' } },
            { subject: { contains: prefix, mode: 'insensitive' } },
          ],
        },
        take: 8,
        select: { recipientEmail: true, subject: true },
      });

      const set = new Set<string>();
      matches.forEach((m) => {
        set.add(m.recipientEmail);
        set.add(m.subject);
      });
      return Array.from(set).slice(0, 8);
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
