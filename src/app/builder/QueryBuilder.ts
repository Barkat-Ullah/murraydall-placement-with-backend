// services/queryBuilder.ts

import { Prisma } from '@prisma/client';

type ExtractSelect<T> = T extends { findMany(args: { select: infer S }): any }
  ? S
  : never;

export class QueryBuilder<
  ModelDelegate extends { findMany: Function; count: Function },
> {
  private model: ModelDelegate;
  private query: Record<string, unknown>;
  private prismaQuery: any = {};
  private primaryKeyField: string = 'id';

  constructor(model: ModelDelegate, query: Record<string, unknown> = {}) {
    this.model = model;
    this.query = query;
  }

  // Search
  search(searchableFields: string[]) {
    const searchTerm = this.query.searchTerm as string;
    if (searchTerm) {
      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        OR: searchableFields.map(field => {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return {
              [parent]: {
                [child]: { contains: searchTerm, mode: 'insensitive' },
              },
            };
          }
          return { [field]: { contains: searchTerm, mode: 'insensitive' } };
        }),
      };
    }
    return this;
  }

  // Filter
  filter() {
    const queryObj = { ...this.query };
    const excludeFields = [
      'searchTerm',
      'sort',
      'limit',
      'page',
      'fields',
      'exclude',
    ];
    excludeFields.forEach(field => delete queryObj[field]);

    const formattedFilters: Record<string, unknown> = {};

    const setNestedObject = (
      obj: Record<string, any>,
      path: string,
      value: unknown,
    ) => {
      const keys = path.split('.');
      let current = obj;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = value;
        } else {
          if (!current[key] || typeof current[key] !== 'object')
            current[key] = {};
          current = current[key];
        }
      });
    };

    for (const [key, value] of Object.entries(queryObj)) {
      setNestedObject(formattedFilters, key, value);
    }

    this.prismaQuery.where = { ...this.prismaQuery.where, ...formattedFilters };
    return this;
  }

  // Optional include
  include(data: any) {
    if (data)
      this.prismaQuery.include = { ...this.prismaQuery.include, ...data };
    return this;
  }

  // Optional select
  select(data: any) {
    if (data) this.prismaQuery.select = { ...this.prismaQuery.select, ...data };
    return this;
  }

  // Where
  where(conditions: Record<string, unknown>) {
    this.prismaQuery.where = { ...this.prismaQuery.where, ...conditions };
    return this;
  }

  // Sorting
  sort() {
    const sortFields = (this.query.sort as string)?.split(',') || [
      '-createdAt',
    ];
    this.prismaQuery.orderBy = sortFields.map(field =>
      field.startsWith('-') ? { [field.slice(1)]: 'desc' } : { [field]: 'asc' },
    );
    return this;
  }

  // Pagination
  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    this.prismaQuery.skip = (page - 1) * limit;
    this.prismaQuery.take = limit;
    return this;
  }

  // Fields selection
  fields() {
    const fieldsParam = this.query.fields as string;
    if (fieldsParam) {
      const fields = fieldsParam.split(',').filter(f => f.trim() !== '');
      if (fields.length > 0) {
        this.prismaQuery.select = {};
        fields.forEach(f => {
          const trimmed = f.trim();
          if (trimmed.startsWith('-'))
            this.prismaQuery.select[trimmed.slice(1)] = false;
          else this.prismaQuery.select[trimmed] = true;
        });

        const hasTrue = Object.values(this.prismaQuery.select).some(
          v => v === true,
        );
        if (!hasTrue) this.prismaQuery.select[this.primaryKeyField] = true;
      }
    }
    return this;
  }

  customFields(data: ExtractSelect<ModelDelegate>) {
    if (data) this.prismaQuery.select = data;
    return this;
  }

  // Exclude fields
  exclude() {
    const excludeParam = this.query.exclude as string;
    if (excludeParam) {
      const fields = excludeParam.split(',').filter(f => f.trim() !== '');
      if (!this.prismaQuery.select) this.prismaQuery.select = {};
      fields.forEach(f => (this.prismaQuery.select[f.trim()] = false));

      const hasTrue = Object.values(this.prismaQuery.select).some(
        v => v === true,
      );
      if (!hasTrue) this.prismaQuery.select[this.primaryKeyField] = true;
    }
    return this;
  }

  // Execute
  async execute() {
    // Run findMany and count safely
    const [results, total] = await Promise.all([
      this.model.findMany(this.prismaQuery).catch(() => []),
      this.model.count({ where: this.prismaQuery.where }).catch(() => 0),
    ]);

    return {
      data: results || [],
      meta: {
        page: Number(this.query.page) || 1,
        limit: Number(this.query.limit) || 10,
        total: total || 0,
        totalPage: total
          ? Math.ceil(total / (Number(this.query.limit) || 10))
          : 0,
      },
    };
  }
}

export default QueryBuilder;
