import { Request, Response } from "express";
import { RetrievalController } from "./retrievalController.js";
import { logger } from "../../shared/utils/logger.js";
import { UserStorySearchResult } from "../../shared/types/index.js";

/**
 * Admin Controller - Handles data viewing and management operations
 */
export class AdminController {
  /**
   * Get all processed user stories from the database
   */
  static async getAllUserStories(req: Request, res: Response) {
    try {
      // Use the initialized service from RetrievalController
      const service = RetrievalController.getService();
      
      // Get query parameters for pagination and filtering
      const limit = parseInt(req.query.limit as string) || 50;
      const format = req.query.format as string || 'json';
      const traceId = `admin-${Date.now()}`;

      logger.detailed('Admin data request', `Fetching user stories with limit: ${limit}, format: ${format}`);

      // Use the retrieval service with a generic query to get sample stories
      const results = await service.retrieveUserStories(
        "sample query for admin view", 
        limit, 
        traceId,
        "hybrid",
        50,
        50
      );

      // If HTML format is requested, return a formatted HTML page
      if (format === 'html') {
        const htmlContent = AdminController.generateDataViewHTML(results.relevantUserStories, {
          total: results.relevantUserStories.length,
          limit
        });
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
      }

      // Return JSON format
      res.json({
        success: true,
        data: {
          userStories: results.relevantUserStories,
          pagination: {
            total: results.relevantUserStories.length,
            limit,
            hasMore: results.relevantUserStories.length === limit
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: "admin-data-view"
        }
      });

    } catch (error) {
      logger.error('Admin', `Error fetching user stories for admin view: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (req.query.format === 'html') {
        const errorHTML = AdminController.generateErrorHTML(error);
        res.setHeader('Content-Type', 'text/html');
        return res.status(500).send(errorHTML);
      }

      res.status(500).json({
        success: false,
        error: "Failed to fetch user stories",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Generate HTML page for data viewing
   */
  private static generateDataViewHTML(userStories: any[], pagination: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QA Bot - Processed Data Viewer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px 15px 0 0;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }
        
        .content {
            padding: 30px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .table-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        .table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        
        .table tbody tr:hover {
            background: #f8f9ff;
        }
        
        .story-id {
            font-weight: 600;
            color: #667eea;
        }
        
        .priority {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .priority.high { background: #fee2e2; color: #dc2626; }
        .priority.medium { background: #fef3c7; color: #d97706; }
        .priority.low { background: #d1fae5; color: #059669; }
        
        .description {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .score {
            font-weight: 600;
            color: #059669;
        }
        
        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        
        .no-data i {
            font-size: 4rem;
            color: #ddd;
            margin-bottom: 20px;
        }
        
        .refresh-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 20px;
            transition: all 0.3s ease;
        }
        
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <i class="fas fa-database"></i>
                Processed User Stories Data
            </h1>
            <p>Database contents as of ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${pagination.total}</div>
                    <div>Total Stories</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${userStories.filter(s => s.priority === 'high').length}</div>
                    <div>High Priority</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${userStories.filter(s => s.priority === 'medium').length}</div>
                    <div>Medium Priority</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${userStories.filter(s => s.priority === 'low').length}</div>
                    <div>Low Priority</div>
                </div>
            </div>
            
            ${userStories.length > 0 ? `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Story ID</th>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Priority</th>
                            <th>Category</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userStories.map(story => `
                        <tr>
                            <td><span class="story-id">${story.storyId || 'N/A'}</span></td>
                            <td>${story.title || 'No title'}</td>
                            <td class="description" title="${(story.description || 'No description').replace(/"/g, '&quot;')}">${story.description || 'No description'}</td>
                            <td><span class="priority ${(story.priority || 'medium').toLowerCase()}">${story.priority || 'Medium'}</span></td>
                            <td>${story.category || 'General'}</td>
                            <td><span class="score">${(story.score || 0).toFixed(2)}</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : `
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <h3>No User Stories Found</h3>
                <p>No processed user stories are available in the database.</p>
                <p>Upload some CSV or TXT files to see data here.</p>
            </div>
            `}
            
            <div style="text-align: center;">
                <button class="refresh-btn" onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i>
                    Refresh Data
                </button>
            </div>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
  }

  /**
   * Generate error HTML page
   */
  private static generateErrorHTML(error: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QA Bot - Data View Error</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
        }
        .error-container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
        }
        .error-icon {
            color: #e74c3c;
            font-size: 3rem;
            margin-bottom: 20px;
        }
        h1 { color: #e74c3c; }
        .error-message {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            font-family: monospace;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
    <div class="error-container">
        <i class="fas fa-exclamation-triangle error-icon"></i>
        <h1>Unable to Load Data</h1>
        <p>There was an error loading the processed user stories data.</p>
        <div class="error-message">
            ${error instanceof Error ? error.message : 'Unknown error occurred'}
        </div>
        <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            <i class="fas fa-redo"></i> Try Again
        </button>
    </div>
</body>
</html>`;
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(req: Request, res: Response) {
    try {
      // Use the initialized service from RetrievalController
      const service = RetrievalController.getService();
      const traceId = `admin-stats-${Date.now()}`;
      
      // Get a sample of stories to analyze
      const results = await service.retrieveUserStories(
        "sample query for stats", 
        100, 
        traceId,
        "hybrid",
        50,
        50
      );

      const stories = results.relevantUserStories;
      
      const stats = {
        totalStories: stories.length,
        priorities: {
          high: stories.filter((s: UserStorySearchResult) => s.priority === 'high').length,
          medium: stories.filter((s: UserStorySearchResult) => s.priority === 'medium').length,
          low: stories.filter((s: UserStorySearchResult) => s.priority === 'low').length,
        },
        categories: stories.reduce((acc: any, story: UserStorySearchResult) => {
          const category = story.category || 'General';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {}),
        averageScore: stories.length > 0 
          ? (stories.reduce((sum: number, s: UserStorySearchResult) => sum + (s.score || 0), 0) / stories.length).toFixed(2)
          : 0
      };

      res.json({
        success: true,
        stats,
        metadata: {
          timestamp: new Date().toISOString(),
          source: "admin-stats"
        }
      });

    } catch (error) {
      logger.error('Admin', `Error fetching database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({
        success: false,
        error: "Failed to fetch database statistics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}
