import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Bot,
  Cpu,
  Filter,
  Search,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const AuditPage: React.FC = () => {
  const state = localDb.getState();
  const [filterActor, setFilterActor] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = state.auditEvents.filter((ev) => {
    if (filterActor !== 'all' && ev.actor_type !== filterActor) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        ev.event_type.toLowerCase().includes(term) ||
        ev.resource_type.toLowerCase().includes(term) ||
        JSON.stringify(ev.details).toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'user':
        return <User className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ai_agent':
        return <Bot className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getResultBadge = (res: string) => {
    switch (res) {
      case 'success':
        return <Badge status="success">SUCCESS</Badge>;
      case 'denied':
        return <Badge status="warning">DENIED</Badge>;
      case 'failure':
        return <Badge status="critical">FAILURE</Badge>;
      default:
        return <Badge status="info">{res.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-900">Cryptographic & Regulatory Audit Trail</h4>
          <p className="text-slate-400 mt-0.5">
            Append-only compliance log. Records all proposal creation events, explicit user approvals, sandbox ledger executions, and AI agent tool invocations with sanitized metadata.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <button
            onClick={() => setFilterActor('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActor === 'all'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-900 bg-surface-card'
            }`}
          >
            All Actors ({state.auditEvents.length})
          </button>
          <button
            onClick={() => setFilterActor('user')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActor === 'user'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-900 bg-surface-card'
            }`}
          >
            Student ({state.auditEvents.filter((e) => e.actor_type === 'user').length})
          </button>
          <button
            onClick={() => setFilterActor('ai_agent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActor === 'ai_agent'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-900 bg-surface-card'
            }`}
          >
            AI Agent ({state.auditEvents.filter((e) => e.actor_type === 'ai_agent').length})
          </button>
          <button
            onClick={() => setFilterActor('system')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActor === 'system'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-900 bg-surface-card'
            }`}
          >
            System ({state.auditEvents.filter((e) => e.actor_type === 'system').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Timeline Event List */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events ({filteredEvents.length})</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Chronological record of sensitive actions</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No audit events found matching the selected filter.
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-white/60 border border-slate-200 text-xs space-y-2 hover:border-slate-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                      {getActorIcon(ev.actor_type)}
                    </span>
                    <span className="font-semibold text-slate-900 font-mono">{ev.event_type}</span>
                    <span className="text-[11px] text-slate-400 capitalize">
                      ({ev.actor_type.replace('_', ' ')})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getResultBadge(ev.result)}
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Sanitized Details JSON */}
                <div className="p-2.5 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-200/50">
                  <pre>{JSON.stringify(ev.details, null, 2)}</pre>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
