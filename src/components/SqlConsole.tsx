import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  Database, 
  Layers, 
  Activity, 
  Trash2, 
  Check, 
  AlertCircle, 
  Copy,
  Table,
  Key,
  Clock
} from 'lucide-react';
import { QueryResult, SqlLogEntry } from '../types';
import { sqlDb } from '../services/sqlDatabase';

export const SqlConsole: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'schemas' | 'logs'>('console');
  
  // Custom query runner
  const defaultQuery = `SELECT 
  c.name AS cliente, 
  COUNT(o.id) AS total_pedidos, 
  ROUND(SUM(o.total_amount), 2) AS total_gasto_reais
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id
ORDER BY total_gasto_reais DESC;`;

  const [queryInput, setQueryInput] = useState(defaultQuery);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [sqlLogs, setSqlLogs] = useState<SqlLogEntry[]>([]);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const sampleQueries = [
    {
      title: 'Top Clientes Mais Fiéis (LTV)',
      sql: `SELECT 
  c.id, 
  c.name AS cliente, 
  c.phone AS telefone,
  COUNT(o.id) AS total_pedidos, 
  ROUND(SUM(o.total_amount), 2) AS total_gasto
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id
ORDER BY total_gasto DESC;`,
    },
    {
      title: 'Vendas por Categoria de Item',
      sql: `SELECT 
  mi.category AS categoria, 
  SUM(oi.quantity) AS unidades_vendidas, 
  ROUND(SUM(oi.subtotal), 2) AS faturamento_total
FROM order_items oi
JOIN menu_items mi ON oi.item_id = mi.id
GROUP BY mi.category
ORDER BY faturamento_total DESC;`,
    },
    {
      title: 'Pedidos em Aberto com Detalhes',
      sql: `SELECT 
  o.id AS pedido_id, 
  c.name AS cliente, 
  o.status, 
  o.payment_method AS pagamento,
  ROUND(o.total_amount, 2) AS valor_total,
  o.created_at AS hora_pedido
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status IN ('NOVO', 'PREPARANDO', 'PRONTO')
ORDER BY o.id ASC;`,
    },
    {
      title: 'Itens com Estoque Baixo (< 35 un)',
      sql: `SELECT id, name, category, stock, price 
FROM menu_items 
WHERE stock < 35 
ORDER BY stock ASC;`,
    },
    {
      title: 'Vendas por Forma de Pagamento',
      sql: `SELECT 
  payment_method AS forma_pagamento, 
  COUNT(id) AS qtd_pedidos, 
  ROUND(SUM(total_amount), 2) AS total_arrecadado
FROM orders
GROUP BY payment_method
ORDER BY total_arrecadado DESC;`,
    },
  ];

  const refreshLogs = () => {
    setSqlLogs(sqlDb.getSqlLogs());
  };

  useEffect(() => {
    refreshLogs();
    const unsub = sqlDb.subscribe(() => {
      refreshLogs();
    });
    return unsub;
  }, []);

  const handleRunQuery = () => {
    setQueryError(null);
    try {
      const res = sqlDb.executeCustomQuery(queryInput);
      setQueryResult(res);
      refreshLogs();
    } catch (err: any) {
      setQueryError(err.message || 'Erro ao executar instrução SQL.');
      setQueryResult(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white">
              Console SQL & Esquema Relacional
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Execute consultas SQL ao vivo com integridade relacional e inspecione logs em tempo real
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeSubTab === 'console'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal SQL</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schemas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeSubTab === 'schemas'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tabelas & Schemas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Logs ao Vivo ({sqlLogs.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: CONSOLE */}
      {activeSubTab === 'console' && (
        <div className="space-y-6">
          {/* Quick Query Templates */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Consultas SQL Pré-Configuradas (1-Clique)
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sample, idx) => (
                <button
                  key={`sample-q-${sample.title}-${idx}`}
                  onClick={() => {
                    setQueryInput(sample.sql);
                    setQueryError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-xs font-medium text-zinc-300 hover:text-emerald-300 transition cursor-pointer"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Editor Area */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-zinc-300 font-semibold">burgersql.sqlite &gt; query_editor.sql</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(queryInput)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
                >
                  {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedQuery ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={handleRunQuery}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Executar SQL</span>
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full p-4 bg-zinc-950 text-emerald-300 font-mono text-xs focus:outline-none resize-y selection:bg-emerald-800 selection:text-white"
              spellCheck={false}
            />
          </div>

          {/* Error Message */}
          {queryError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Erro de Execução SQL:</span>
                <p className="mt-1">{queryError}</p>
              </div>
            </div>
          )}

          {/* Query Results Table */}
          {queryResult && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/70 border-b border-zinc-800 text-xs text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-emerald-400" />
                    Resultado da Consulta
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {queryResult.rowCount} linha(s) retornada(s)
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{queryResult.executionTimeMs} ms</span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-300 font-bold sticky top-0">
                    <tr>
                      {queryResult.columns.map((col, idx) => (
                        <th key={`res-col-${col}-${idx}`} className="py-2.5 px-4 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {queryResult.values.map((row, rIdx) => (
                      <tr key={`res-row-${rIdx}`} className="hover:bg-zinc-800/50 transition">
                        {row.map((val, cIdx) => (
                          <td key={`res-cell-${rIdx}-${cIdx}`} className="py-2 px-4 whitespace-nowrap text-zinc-200">
                            {val !== null && val !== undefined ? String(val) : <span className="text-zinc-600 italic">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SCHEMAS & RELATIONS */}
      {activeSubTab === 'schemas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Table customers */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Table className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base font-mono">customers</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Armazena dados dos clientes e compradores</p>
            <div className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> id
                </span>
                <span className="text-zinc-500">INTEGER PRIMARY KEY AUTOINCREMENT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">name</span>
                <span className="text-zinc-500">TEXT NOT NULL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">email</span>
                <span className="text-zinc-500">TEXT NOT NULL UNIQUE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">phone</span>
                <span className="text-zinc-500">TEXT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">address</span>
                <span className="text-zinc-500">TEXT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">created_at</span>
                <span className="text-zinc-500">DATETIME</span>
              </div>
            </div>
          </div>

          {/* Table menu_items */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Table className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-white text-base font-mono">menu_items</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Cardápio, hambúrgueres, preços e controle de estoque</p>
            <div className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> id
                </span>
                <span className="text-zinc-500">INTEGER PRIMARY KEY AUTOINCREMENT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">name</span>
                <span className="text-zinc-500">TEXT NOT NULL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">price</span>
                <span className="text-zinc-500">REAL NOT NULL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">category</span>
                <span className="text-zinc-500">TEXT NOT NULL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">stock</span>
                <span className="text-zinc-500">INTEGER DEFAULT 50</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">is_available</span>
                <span className="text-zinc-500">INTEGER DEFAULT 1</span>
              </div>
            </div>
          </div>

          {/* Table orders */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Table className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base font-mono">orders</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Transações de compra, status do pedido e pagamento</p>
            <div className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> id
                </span>
                <span className="text-zinc-500">INTEGER PRIMARY KEY AUTOINCREMENT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-emerald-500/30">
                <span className="text-emerald-400">customer_id</span>
                <span className="text-zinc-500">FK -&gt; customers(id) ON DELETE CASCADE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">status</span>
                <span className="text-zinc-500">TEXT ('NOVO', 'PREPARANDO', ...)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">total_amount</span>
                <span className="text-zinc-500">REAL NOT NULL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">payment_method</span>
                <span className="text-zinc-500">TEXT ('PIX', 'CARTAO', ...)</span>
              </div>
            </div>
          </div>

          {/* Table order_items */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Table className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-white text-base font-mono">order_items</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Tabela associativa relacional (itens de cada pedido)</p>
            <div className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> id
                </span>
                <span className="text-zinc-500">INTEGER PRIMARY KEY AUTOINCREMENT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-emerald-500/30">
                <span className="text-emerald-400">order_id</span>
                <span className="text-zinc-500">FK -&gt; orders(id) ON DELETE CASCADE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-orange-500/30">
                <span className="text-orange-400">item_id</span>
                <span className="text-zinc-500">FK -&gt; menu_items(id)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">quantity</span>
                <span className="text-zinc-500">INTEGER NOT NULL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-200">unit_price, subtotal</span>
                <span className="text-zinc-500">REAL NOT NULL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: LIVE LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Fluxo ao vivo de todas as instruções SQL executadas pelas telas do sistema:
            </span>
            <button
              onClick={() => sqlDb.clearSqlLogs()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Logs</span>
            </button>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-900 font-mono text-xs">
            {sqlLogs.map((log, idx) => {
              const badgeColors: Record<SqlLogEntry['type'], string> = {
                SELECT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                INSERT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                UPDATE: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
                SCHEMA: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                OTHER: 'bg-zinc-800 text-zinc-400 border-zinc-700',
              };

              return (
                <div key={`sql-log-item-${log.id}-${idx}`} className="p-3 hover:bg-zinc-900/50 transition flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColors[log.type]}`}>
                      {log.type}
                    </span>
                    <span className="text-zinc-200 break-all">{log.query}</span>
                  </div>
                  <div className="text-right shrink-0 text-zinc-500 text-[11px]">
                    <p>{log.executed_at}</p>
                    <p className="text-[10px] text-zinc-600">{log.duration_ms} ms</p>
                  </div>
                </div>
              );
            })}

            {sqlLogs.length === 0 && (
              <div className="p-8 text-center text-zinc-600 text-xs">
                Nenhum log registrado ainda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
