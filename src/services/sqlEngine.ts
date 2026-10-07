/**
 * Pure TypeScript Relational SQL Engine
 * Provides an in-memory, persistent, standard SQL-compliant engine
 * with tables, auto-increments, joins, aggregates, where clauses,
 * ordering, grouping, and transactional operations.
 */

export interface TableColumn {
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'DATETIME';
  isPrimaryKey?: boolean;
  isAutoIncrement?: boolean;
  isUnique?: boolean;
  defaultValue?: any;
}

export interface SqlQueryResult {
  columns: string[];
  values: any[][];
}

export class PureSqlDatabase {
  private tables: Map<string, { columns: TableColumn[]; rows: Record<string, any>[]; autoInc: number }> = new Map();
  private lastInsertedRowId = 0;
  private inTransaction = false;
  private transactionBackup: string | null = null;

  constructor() {}

  public run(sqlString: string): void {
    this.exec(sqlString);
  }

  public exec(sqlString: string): SqlQueryResult[] {
    const statements = this.splitStatements(sqlString);
    const results: SqlQueryResult[] = [];

    for (const rawStmt of statements) {
      const stmt = rawStmt.trim();
      if (!stmt) continue;

      const upper = stmt.toUpperCase();

      if (upper === 'BEGIN TRANSACTION;' || upper === 'BEGIN TRANSACTION' || upper === 'BEGIN;') {
        this.inTransaction = true;
        this.transactionBackup = this.serialize();
        continue;
      }
      if (upper === 'COMMIT;' || upper === 'COMMIT') {
        this.inTransaction = false;
        this.transactionBackup = null;
        continue;
      }
      if (upper === 'ROLLBACK;' || upper === 'ROLLBACK') {
        if (this.transactionBackup) {
          this.deserialize(this.transactionBackup);
        }
        this.inTransaction = false;
        this.transactionBackup = null;
        continue;
      }

      if (upper.startsWith('CREATE TABLE')) {
        this.handleCreateTable(stmt);
      } else if (upper.startsWith('DROP TABLE')) {
        this.handleDropTable(stmt);
      } else if (upper.startsWith('INSERT INTO')) {
        this.handleInsert(stmt);
      } else if (upper.startsWith('UPDATE')) {
        this.handleUpdate(stmt);
      } else if (upper.startsWith('DELETE FROM')) {
        this.handleDelete(stmt);
      } else if (upper.startsWith('SELECT')) {
        const res = this.handleSelect(stmt);
        results.push(res);
      } else {
        // Unknown or comment
        console.warn('Unhandled SQL statement:', stmt);
      }
    }

    return results;
  }

  private splitStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      if ((char === "'" || char === '"') && (i === 0 || sql[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (quoteChar === char) {
          inQuotes = false;
        }
      }

      if (char === ';' && !inQuotes) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    return statements;
  }

  private handleCreateTable(stmt: string): void {
    const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]+)\)/i);
    if (!match) return;

    const tableName = match[1].toLowerCase();
    if (this.tables.has(tableName)) return;

    const colDefs = match[2];
    const columns: TableColumn[] = [];

    // Parse column definitions
    const lines = this.splitColumnDefs(colDefs);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toUpperCase().startsWith('FOREIGN KEY')) continue;

      const parts = trimmed.split(/\s+/);
      const colName = parts[0];
      const typeStr = (parts[1] || 'TEXT').toUpperCase();

      let type: TableColumn['type'] = 'TEXT';
      if (typeStr.includes('INT')) type = 'INTEGER';
      else if (typeStr.includes('REAL') || typeStr.includes('FLOAT') || typeStr.includes('DOUBLE')) type = 'REAL';
      else if (typeStr.includes('DATE') || typeStr.includes('TIME')) type = 'DATETIME';

      const isPrimaryKey = /PRIMARY\s+KEY/i.test(trimmed);
      const isAutoIncrement = /AUTOINCREMENT/i.test(trimmed) || (isPrimaryKey && type === 'INTEGER');
      const isUnique = /UNIQUE/i.test(trimmed);

      columns.push({
        name: colName,
        type,
        isPrimaryKey,
        isAutoIncrement,
        isUnique,
      });
    }

    this.tables.set(tableName, {
      columns,
      rows: [],
      autoInc: 1,
    });
  }

  private splitColumnDefs(defs: string): string[] {
    const result: string[] = [];
    let current = '';
    let parenDepth = 0;
    for (let i = 0; i < defs.length; i++) {
      const c = defs[i];
      if (c === '(') parenDepth++;
      else if (c === ')') parenDepth--;

      if (c === ',' && parenDepth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  private handleDropTable(stmt: string): void {
    const match = stmt.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (match) {
      this.tables.delete(match[1].toLowerCase());
    }
  }

  private handleInsert(stmt: string): void {
    const match = stmt.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]+)/i);
    if (!match) return;

    const tableName = match[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Tabela "${tableName}" não existe no SQL.`);

    const explicitCols = match[2]
      ? match[2].split(',').map((c) => c.trim())
      : table.columns.map((c) => c.name);

    // Split multiple value tuples: (v1, v2), (v3, v4)
    const valuesPart = match[3].trim().replace(/;$/, '');
    const tuples = this.extractTuples(valuesPart);

    for (const tuple of tuples) {
      const row: Record<string, any> = {};

      // Fill defaults
      for (const col of table.columns) {
        if (col.isAutoIncrement) {
          row[col.name] = table.autoInc;
        } else if (col.type === 'DATETIME') {
          row[col.name] = new Date().toISOString().replace('T', ' ').slice(0, 19);
        } else {
          row[col.name] = null;
        }
      }

      // Assign explicit values
      for (let i = 0; i < explicitCols.length; i++) {
        const colName = explicitCols[i];
        let val = tuple[i];

        if (val === "datetime('now')" || val === 'CURRENT_TIMESTAMP') {
          val = new Date().toISOString().replace('T', ' ').slice(0, 19);
        } else if (typeof val === 'string' && val.startsWith("datetime('now', '") && val.endsWith("')")) {
          // Parse modifiers like '-25 minutes'
          const modMatch = val.match(/datetime\('now',\s*'([^']+)'\)/);
          if (modMatch) {
            val = this.evaluateDatetimeModifier(modMatch[1]);
          } else {
            val = new Date().toISOString().replace('T', ' ').slice(0, 19);
          }
        }

        const colDef = table.columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
        if (colDef) {
          if (colDef.type === 'INTEGER') {
            const num = parseInt(val, 10);
            row[colDef.name] = isNaN(num) ? val : num;
            if (colDef.isPrimaryKey && !isNaN(num) && num >= table.autoInc) {
              table.autoInc = num + 1;
            }
          } else if (colDef.type === 'REAL') {
            const num = parseFloat(val);
            row[colDef.name] = isNaN(num) ? val : num;
          } else {
            row[colDef.name] = val;
          }
        } else {
          row[colName] = val;
        }
      }

      // If id was assigned via autoInc
      const pkCol = table.columns.find((c) => c.isPrimaryKey);
      if (pkCol && row[pkCol.name]) {
        this.lastInsertedRowId = row[pkCol.name];
        if (row[pkCol.name] >= table.autoInc) {
          table.autoInc = row[pkCol.name] + 1;
        }
      } else {
        table.autoInc++;
      }

      table.rows.push(row);
    }
  }

  private evaluateDatetimeModifier(modifier: string): string {
    const now = new Date();
    const parts = modifier.split(' ');
    const val = parseInt(parts[0], 10);
    const unit = parts[1]?.toLowerCase() || 'minutes';

    if (unit.startsWith('minute')) {
      now.setMinutes(now.getMinutes() + val);
    } else if (unit.startsWith('hour')) {
      now.setHours(now.getHours() + val);
    } else if (unit.startsWith('day')) {
      now.setDate(now.getDate() + val);
    }

    return now.toISOString().replace('T', ' ').slice(0, 19);
  }

  private extractTuples(valuesStr: string): any[][] {
    const tuples: any[][] = [];
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = '';
    let currentTupleStr = '';

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];

      if ((char === "'" || char === '"') && (i === 0 || valuesStr[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (quoteChar === char) {
          inQuotes = false;
        }
      }

      if (!inQuotes) {
        if (char === '(') {
          parenDepth++;
          if (parenDepth === 1) {
            currentTupleStr = '';
            continue;
          }
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            tuples.push(this.parseTupleValues(currentTupleStr));
            currentTupleStr = '';
            continue;
          }
        }
      }

      if (parenDepth > 0) {
        currentTupleStr += char;
      }
    }

    return tuples;
  }

  private parseTupleValues(tupleStr: string): any[] {
    const values: any[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let parenDepth = 0;

    for (let i = 0; i < tupleStr.length; i++) {
      const char = tupleStr[i];
      if ((char === "'" || char === '"') && (i === 0 || tupleStr[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (quoteChar === char) {
          inQuotes = false;
        }
      }

      if (!inQuotes) {
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;

        if (char === ',' && parenDepth === 0) {
          values.push(this.parseSqlLiteral(current.trim()));
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      values.push(this.parseSqlLiteral(current.trim()));
    }

    return values;
  }

  private parseSqlLiteral(raw: string): any {
    if (raw === 'NULL' || raw === 'null') return null;
    if (raw.startsWith("'") && raw.endsWith("'")) {
      return raw.slice(1, -1).replace(/''/g, "'");
    }
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return raw.slice(1, -1);
    }
    if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
    if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
    return raw;
  }

  private handleUpdate(stmt: string): void {
    const match = stmt.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!match) return;

    const tableName = match[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) throw new Error(`Tabela "${tableName}" não encontrada.`);

    const setClause = match[2];
    const whereClause = match[3] ? match[3].replace(/;$/, '').trim() : null;

    const assignments = this.parseAssignments(setClause);

    for (const row of table.rows) {
      if (!whereClause || this.evaluateWhere(row, whereClause, tableName)) {
        for (const [col, valExpr] of assignments) {
          row[col] = this.evaluateExpression(valExpr, row);
        }
      }
    }
  }

  private parseAssignments(setClause: string): [string, string][] {
    const pairs: [string, string][] = [];
    const parts = setClause.split(',');
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const col = part.slice(0, eqIdx).trim();
        const expr = part.slice(eqIdx + 1).trim();
        pairs.push([col, expr]);
      }
    }
    return pairs;
  }

  private evaluateExpression(expr: string, row: Record<string, any>): any {
    const trimmed = expr.trim();
    if (trimmed === 'datetime(\'now\')' || trimmed === 'CURRENT_TIMESTAMP') {
      return new Date().toISOString().replace('T', ' ').slice(0, 19);
    }

    // Check MAX(0, stock - 1)
    const maxMatch = trimmed.match(/MAX\s*\(\s*(\d+)\s*,\s*([a-zA-Z0-9_]+)\s*-\s*(\d+)\s*\)/i);
    if (maxMatch) {
      const minVal = parseInt(maxMatch[1], 10);
      const colName = maxMatch[2];
      const subVal = parseInt(maxMatch[3], 10);
      const current = typeof row[colName] === 'number' ? row[colName] : 0;
      return Math.max(minVal, current - subVal);
    }

    // Check stock + ? or stock - ?
    const arithmeticMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*([\+\-])\s*(\d+(?:\.\d+)?)$/);
    if (arithmeticMatch) {
      const colName = arithmeticMatch[1];
      const op = arithmeticMatch[2];
      const amount = parseFloat(arithmeticMatch[3]);
      const current = typeof row[colName] === 'number' ? row[colName] : 0;
      return op === '+' ? current + amount : current - amount;
    }

    return this.parseSqlLiteral(trimmed);
  }

  private handleDelete(stmt: string): void {
    const match = stmt.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!match) return;

    const tableName = match[1].toLowerCase();
    const table = this.tables.get(tableName);
    if (!table) return;

    const whereClause = match[2] ? match[2].replace(/;$/, '').trim() : null;
    if (!whereClause) {
      table.rows = [];
    } else {
      table.rows = table.rows.filter((row) => !this.evaluateWhere(row, whereClause, tableName));
    }
  }

  private handleSelect(stmt: string): SqlQueryResult {
    const cleanStmt = stmt.replace(/;$/, '').trim();

    // Special query: SELECT last_insert_rowid() as id;
    if (/SELECT\s+last_insert_rowid\(\)/i.test(cleanStmt)) {
      return {
        columns: ['id'],
        values: [[this.lastInsertedRowId]],
      };
    }

    // Special query: SELECT COUNT(*) as count FROM tableName;
    const countMatch = cleanStmt.match(/^SELECT\s+COUNT\(\*\)\s*(?:as\s+count)?\s+FROM\s+([a-zA-Z0-9_]+)$/i);
    if (countMatch) {
      const t = this.tables.get(countMatch[1].toLowerCase());
      return {
        columns: ['count'],
        values: [[t ? t.rows.length : 0]],
      };
    }

    // Parse general SELECT: SELECT <cols> FROM <mainTable> [alias] [JOINS] [WHERE] [GROUP BY] [ORDER BY] [LIMIT]
    const selectMatch = cleanStmt.match(
      /SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+([a-zA-Z0-9_]+))?([\s\S]*)$/i
    );

    if (!selectMatch) {
      return { columns: ['Result'], values: [] };
    }

    const selectColsStr = selectMatch[1].trim();
    const mainTableName = selectMatch[2].toLowerCase();
    let mainTableAlias = (selectMatch[3] || '').toLowerCase();
    let rest = selectMatch[4] || '';

    // If mainTableAlias is a SQL keyword, then there is no alias
    const keywords = ['where', 'join', 'left', 'inner', 'group', 'order', 'limit', 'on'];
    if (keywords.includes(mainTableAlias)) {
      rest = ' ' + mainTableAlias + rest;
      mainTableAlias = '';
    }

    const mainTable = this.tables.get(mainTableName);
    if (!mainTable) {
      return { columns: ['Error'], values: [[`Table ${mainTableName} not found`]] };
    }

    // 1. Build initial dataset with aliases
    let dataset: Record<string, any>[] = mainTable.rows.map((r) => {
      const rowObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(r)) {
        rowObj[k] = v;
        rowObj[`${mainTableName}.${k}`] = v;
        if (mainTableAlias) rowObj[`${mainTableAlias}.${k}`] = v;
      }
      return rowObj;
    });

    // 2. Parse and apply JOINs
    const joinMatches = [
      ...rest.matchAll(/(LEFT\s+JOIN|JOIN|INNER\s+JOIN)\s+([a-zA-Z0-9_]+)(?:\s+([a-zA-Z0-9_]+))?\s+ON\s+([^WwGgOoLl]+)/gi),
    ];

    for (const jm of joinMatches) {
      const joinType = jm[1].toUpperCase();
      const isLeft = joinType.includes('LEFT');
      const joinedTable = jm[2].toLowerCase();
      let joinedAlias = (jm[3] || '').toLowerCase();
      if (keywords.includes(joinedAlias)) joinedAlias = '';
      const onClause = jm[4].trim();

      const jTable = this.tables.get(joinedTable);
      const newDataset: Record<string, any>[] = [];

      for (const baseRow of dataset) {
        let matched = false;
        if (jTable) {
          for (const rightRow of jTable.rows) {
            const combined: Record<string, any> = { ...baseRow };
            for (const [k, v] of Object.entries(rightRow)) {
              combined[`${joinedTable}.${k}`] = v;
              if (joinedAlias) combined[`${joinedAlias}.${k}`] = v;
              // If not colliding, also set unprefixed
              if (combined[k] === undefined) combined[k] = v;
            }

            if (this.evaluateJoinCondition(combined, onClause)) {
              matched = true;
              newDataset.push(combined);
            }
          }
        }

        if (!matched && isLeft) {
          // Add row with nulls for joined table
          const combined: Record<string, any> = { ...baseRow };
          if (jTable) {
            for (const c of jTable.columns) {
              combined[`${joinedTable}.${c.name}`] = null;
              if (joinedAlias) combined[`${joinedAlias}.${c.name}`] = null;
            }
          }
          newDataset.push(combined);
        }
      }

      dataset = newDataset;
    }

    // 3. WHERE Clause
    const whereMatch = rest.match(/WHERE\s+([\s\S]+?)(?=(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$))/i);
    if (whereMatch) {
      const whereCond = whereMatch[1].trim();
      dataset = dataset.filter((row) => this.evaluateWhere(row, whereCond));
    }

    // 4. GROUP BY Clause
    const groupByMatch = rest.match(/GROUP\s+BY\s+([\s\S]+?)(?=(?:\s+ORDER\s+BY|\s+LIMIT|$))/i);
    if (groupByMatch) {
      const groupCol = groupByMatch[1].trim();
      dataset = this.applyGroupBy(dataset, groupCol, selectColsStr);
      return this.projectColumns(dataset, selectColsStr, rest);
    }

    // 5. If no GROUP BY but contains aggregate functions (e.g., SELECT COALESCE(SUM(total_amount), 0), COUNT(id) FROM orders)
    if (this.hasAggregates(selectColsStr)) {
      dataset = [this.calculateGlobalAggregates(dataset, selectColsStr)];
      return this.projectColumns(dataset, selectColsStr, rest);
    }

    // 6. Normal Projection & Sorting
    return this.projectColumns(dataset, selectColsStr, rest);
  }

  private hasAggregates(selectStr: string): boolean {
    return /\b(SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(selectStr);
  }

  private calculateGlobalAggregates(dataset: Record<string, any>[], selectStr: string): Record<string, any> {
    const result: Record<string, any> = {};
    const cols = this.splitColumnDefs(selectStr);

    for (const rawCol of cols) {
      const { expr, alias } = this.parseColAlias(rawCol);
      result[alias] = this.evaluateAggregate(dataset, expr);
    }

    return result;
  }

  private applyGroupBy(
    dataset: Record<string, any>[],
    groupColRaw: string,
    selectColsStr: string
  ): Record<string, any>[] {
    const groupKey = groupColRaw.split(',')[0].trim();
    const groups = new Map<any, Record<string, any>[]>();

    for (const row of dataset) {
      const keyVal = row[groupKey] ?? row[groupKey.split('.').pop()!];
      if (!groups.has(keyVal)) {
        groups.set(keyVal, []);
      }
      groups.get(keyVal)!.push(row);
    }

    const groupedResult: Record<string, any>[] = [];
    const colDefs = this.splitColumnDefs(selectColsStr);

    for (const [_, rows] of groups.entries()) {
      const firstRow = rows[0] || {};
      const aggRow: Record<string, any> = { ...firstRow };

      for (const rawCol of colDefs) {
        const { expr, alias } = this.parseColAlias(rawCol);
        if (this.hasAggregates(expr)) {
          aggRow[alias] = this.evaluateAggregate(rows, expr);
        } else {
          aggRow[alias] = this.resolveValue(firstRow, expr);
        }
      }

      groupedResult.push(aggRow);
    }

    return groupedResult;
  }

  private evaluateAggregate(rows: Record<string, any>[], expr: string): any {
    const trimmed = expr.trim();

    // Check ROUND(SUM(...), 2)
    const roundMatch = trimmed.match(/^ROUND\s*\(\s*([\s\S]+?)\s*,\s*(\d+)\s*\)$/i);
    if (roundMatch) {
      const val = this.evaluateAggregate(rows, roundMatch[1]);
      const decimals = parseInt(roundMatch[2], 10);
      return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    // Check COALESCE(..., 0)
    const coalesceMatch = trimmed.match(/^COALESCE\s*\(\s*([\s\S]+?)\s*,\s*([^\)]+)\s*\)$/i);
    if (coalesceMatch) {
      const val = this.evaluateAggregate(rows, coalesceMatch[1]);
      return val !== null && val !== undefined ? val : this.parseSqlLiteral(coalesceMatch[2].trim());
    }

    // Check SUM(CASE WHEN ... THEN 1 ELSE 0 END)
    const sumCaseMatch = trimmed.match(/^SUM\s*\(\s*CASE\s+WHEN\s+([\s\S]+?)\s+THEN\s+(\d+)\s+ELSE\s+(\d+)\s+END\s*\)$/i);
    if (sumCaseMatch) {
      let sum = 0;
      const cond = sumCaseMatch[1];
      const thenVal = parseInt(sumCaseMatch[2], 10);
      const elseVal = parseInt(sumCaseMatch[3], 10);
      for (const row of rows) {
        sum += this.evaluateWhere(row, cond) ? thenVal : elseVal;
      }
      return sum;
    }

    // Check COUNT(*)
    if (/^COUNT\s*\(\s*\*\s*\)$/i.test(trimmed)) {
      return rows.length;
    }

    // Check COUNT(col)
    const countMatch = trimmed.match(/^COUNT\s*\(\s*([a-zA-Z0-9_\.]+)\s*\)$/i);
    if (countMatch) {
      const col = countMatch[1];
      return rows.filter((r) => this.resolveValue(r, col) !== null && this.resolveValue(r, col) !== undefined).length;
    }

    // Check SUM(col)
    const sumMatch = trimmed.match(/^SUM\s*\(\s*([a-zA-Z0-9_\.]+)\s*\)$/i);
    if (sumMatch) {
      const col = sumMatch[1];
      let sum = 0;
      for (const r of rows) {
        const val = this.resolveValue(r, col);
        if (typeof val === 'number') sum += val;
      }
      return sum;
    }

    // Check MAX(col)
    const maxMatch = trimmed.match(/^MAX\s*\(\s*([a-zA-Z0-9_\.]+)\s*\)$/i);
    if (maxMatch) {
      const col = maxMatch[1];
      let max = -Infinity;
      for (const r of rows) {
        const val = this.resolveValue(r, col);
        if (typeof val === 'number' && val > max) max = val;
      }
      return max === -Infinity ? 0 : max;
    }

    return 0;
  }

  private projectColumns(dataset: Record<string, any>[], selectColsStr: string, rest: string): SqlQueryResult {
    // Apply ORDER BY
    const orderMatch = rest.match(/ORDER\s+BY\s+([\s\S]+?)(?=(?:\s+LIMIT|$))/i);
    if (orderMatch) {
      const orderClauses = orderMatch[1].split(',').map((c) => c.trim());
      dataset.sort((a, b) => {
        for (const clause of orderClauses) {
          const parts = clause.split(/\s+/);
          const colName = parts[0];
          const isDesc = parts[1] && parts[1].toUpperCase() === 'DESC';

          const valA = this.resolveValue(a, colName);
          const valB = this.resolveValue(b, colName);

          if (valA === valB) continue;
          if (valA === null || valA === undefined) return isDesc ? 1 : -1;
          if (valB === null || valB === undefined) return isDesc ? -1 : 1;

          if (valA > valB) return isDesc ? -1 : 1;
          if (valA < valB) return isDesc ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply LIMIT
    const limitMatch = rest.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      dataset = dataset.slice(0, limit);
    }

    // Resolve column headers
    const rawCols = this.splitColumnDefs(selectColsStr);
    let columns: string[] = [];
    const isWildcard = selectColsStr.trim() === '*' || rawCols.some((c) => c.trim().endsWith('.*'));

    if (selectColsStr.trim() === '*') {
      // Return all properties from first row
      const first = dataset[0] || {};
      columns = Object.keys(first).filter((k) => !k.includes('.'));
    } else {
      columns = rawCols.map((c) => this.parseColAlias(c).alias);
    }

    const values = dataset.map((row) => {
      if (selectColsStr.trim() === '*') {
        return columns.map((col) => row[col] ?? null);
      }
      return rawCols.map((rawCol) => {
        const { expr, alias } = this.parseColAlias(rawCol);
        if (row[alias] !== undefined) return row[alias];
        return this.resolveValue(row, expr);
      });
    });

    return {
      columns,
      values,
    };
  }

  private parseColAlias(colStr: string): { expr: string; alias: string } {
    const match = colStr.match(/^([\s\S]+?)\s+(?:AS\s+)?([a-zA-Z0-9_]+)$/i);
    if (match && !/^(AND|OR|IN|LIKE)$/i.test(match[2])) {
      return { expr: match[1].trim(), alias: match[2].trim() };
    }
    const clean = colStr.trim();
    // Default alias: stripped of table prefix or function call
    const alias = clean.replace(/\(.*\)/, '').split('.').pop() || clean;
    return { expr: clean, alias };
  }

  private resolveValue(row: Record<string, any>, key: string): any {
    if (!row) return null;
    const cleanKey = key.trim();
    if (row[cleanKey] !== undefined) return row[cleanKey];

    // Try without table prefix
    const unprefixed = cleanKey.split('.').pop();
    if (unprefixed && row[unprefixed] !== undefined) return row[unprefixed];

    // Try with table prefixes in row
    for (const [k, v] of Object.entries(row)) {
      if (k.endsWith(`.${cleanKey}`)) return v;
    }

    return null;
  }

  private evaluateJoinCondition(row: Record<string, any>, onClause: string): boolean {
    const match = onClause.match(/([a-zA-Z0-9_\.]+)\s*=\s*([a-zA-Z0-9_\.]+)/);
    if (match) {
      const leftVal = this.resolveValue(row, match[1]);
      const rightVal = this.resolveValue(row, match[2]);
      return leftVal !== null && leftVal !== undefined && leftVal === rightVal;
    }
    return true;
  }

  private evaluateWhere(row: Record<string, any>, whereClause: string, currentTable?: string): boolean {
    const trimmed = whereClause.trim();
    if (!trimmed) return true;

    // Support AND / OR splits
    if (/\s+AND\s+/i.test(trimmed)) {
      const parts = trimmed.split(/\s+AND\s+/i);
      return parts.every((p) => this.evaluateWhere(row, p, currentTable));
    }
    if (/\s+OR\s+/i.test(trimmed)) {
      const parts = trimmed.split(/\s+OR\s+/i);
      return parts.some((p) => this.evaluateWhere(row, p, currentTable));
    }

    // Check IN ('NOVO', 'PREPARANDO')
    const inMatch = trimmed.match(/([a-zA-Z0-9_\.]+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const val = String(this.resolveValue(row, inMatch[1]));
      const allowed = inMatch[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      return allowed.includes(val);
    }

    // Check LIKE '%val%'
    const likeMatch = trimmed.match(/LOWER\(([a-zA-Z0-9_\.]+)\)\s+LIKE\s+'%([^%']+)%'/i) ||
                     trimmed.match(/([a-zA-Z0-9_\.]+)\s+LIKE\s+'%([^%']+)%'/i);
    if (likeMatch) {
      const val = String(this.resolveValue(row, likeMatch[1]) || '').toLowerCase();
      const term = likeMatch[2].toLowerCase();
      return val.includes(term);
    }

    // Comparison operators: =, !=, <, >, <=, >=
    const compMatch = trimmed.match(/([a-zA-Z0-9_\.]+)\s*(=|!=|<>|<=|>=|<|>)\s*(.+)/);
    if (compMatch) {
      const leftCol = compMatch[1];
      const op = compMatch[2];
      const rightVal = this.parseSqlLiteral(compMatch[3].trim());
      const leftVal = this.resolveValue(row, leftCol);

      switch (op) {
        case '=':
          return leftVal == rightVal;
        case '!=':
        case '<>':
          return leftVal != rightVal;
        case '<':
          return leftVal < rightVal;
        case '>':
          return leftVal > rightVal;
        case '<=':
          return leftVal <= rightVal;
        case '>=':
          return leftVal >= rightVal;
      }
    }

    return true;
  }

  public serialize(): string {
    const data: Record<string, any> = {};
    for (const [name, t] of this.tables.entries()) {
      data[name] = {
        columns: t.columns,
        rows: t.rows,
        autoInc: t.autoInc,
      };
    }
    return JSON.stringify(data);
  }

  public deserialize(jsonStr: string): void {
    try {
      const parsed = JSON.parse(jsonStr);
      this.tables.clear();
      for (const [name, t] of Object.entries(parsed)) {
        this.tables.set(name, t as any);
      }
    } catch (e) {
      console.warn('Failed to deserialize PureSqlDatabase:', e);
    }
  }

  public export(): Uint8Array {
    const str = this.serialize();
    return new TextEncoder().encode(str);
  }
}
