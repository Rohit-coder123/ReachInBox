import { Request, Response } from 'express';
import { elasticsearchService } from './elasticsearch.service';
import { ApiResponse } from '../../shared/response';

export class SearchController {
  /**
   * Search emails across recipients, subjects, status, and scheduled time
   */
  async search(req: Request, res: Response): Promise<void> {
    const { q, status, page, limit } = req.query;

    const results = await elasticsearchService.searchEmails({
      query: q ? String(q) : undefined,
      status: status ? String(status) : undefined,
      userId: req.user?.id,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    ApiResponse.paginated(
      res,
      results.hits,
      {
        page: results.page,
        limit: results.limit,
        total: results.total,
        totalPages: results.totalPages,
        hasNext: results.page < results.totalPages,
        hasPrev: results.page > 1,
      }
    );
  }

  /**
   * Autocomplete endpoint for real-time searchbar suggestion dropdown
   */
  async autocomplete(req: Request, res: Response): Promise<void> {
    const query = req.query.q ? String(req.query.q) : '';
    const suggestions = await elasticsearchService.autocomplete(query, req.user?.id);

    ApiResponse.success(res, { suggestions });
  }
}

export const searchController = new SearchController();
