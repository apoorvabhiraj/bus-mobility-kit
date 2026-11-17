import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export type RequestLocation = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, location: RequestLocation = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[location];
      const parsed = schema.parse(dataToValidate);
      req[location] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(422).json({
          code: 'VALIDATION_ERROR',
          message: 'Request data failed schema validation',
          issues: err.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      next(err);
    }
  };
}
