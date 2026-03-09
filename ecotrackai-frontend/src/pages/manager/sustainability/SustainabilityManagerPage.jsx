import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import approvalService from '../../../services/approval.service';
import carbonService from '../../../services/carbon.service';
import { canTransitionCarbon, getTimelineChips } from '../../../utils/statusMachines';

const extractApprovals = (response) =>
  response?.data?.data?.approvals ||
  response?.data?.approvals ||
  response?.approvals ||
  [];

const SustainabilityManagerPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decisionNote, setDecisionNote] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const activeTab = searchParams.get('tab') || 'pending';

  const loadPending = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await approvalService.getSustainabilityApprovals();
      setRecords(extractApprovals(response));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load pending carbon verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const getCarbonRecordId = (approval) =>
    approval?.carbon_record_id ||
    approval?.related_record_id ||
    approval?.record_id ||
    approval?.target_id ||
    null;

  const submitDecision = async (approval, decision) => {
    const note = decisionNote[approval.approval_id] || '';
    const currentStatus = approval.verification_status || 'pending';

    if (!canTransitionCarbon(currentStatus, decision)) {
      setError(`Invalid carbon status transition: ${currentStatus} -> ${decision}`);
      return;
    }

    if (decision === 'revision_requested' && !note.trim()) {
      setError('Revision note is required when requesting revision');
      return;
    }

    setSubmittingId(approval.approval_id);
    setError('');
    try {
      const carbonRecordId = getCarbonRecordId(approval);
      if (carbonRecordId) {
        await carbonService.verifyCarbonRecord(carbonRecordId, decision, note, currentStatus);
      } else {
        // Fallback to approval decision endpoint if carbon record id is not exposed.
        await approvalService.submitDecision(
          approval.approval_id,
          decision === 'verified' ? 'approved' : 'declined',
          note
        );
      }
      await loadPending();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit carbon decision');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Layout currentPage="Sustainability Manager Dashboard" user={user}>
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        {activeTab === 'pending' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4">
            <h2 className="text-lg font-semibold text-[var(--text-100)]">Pending Carbon Verifications</h2>
            <p className="text-sm text-[var(--text-300)] mt-1">
              Verify records before EcoTrust points are finalized.
            </p>
          </div>
        ) : null}

        {loading && activeTab === 'pending' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 text-[var(--text-300)]">
            Loading pending records...
          </div>
        ) : null}

        {!loading && records.length === 0 && activeTab === 'pending' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 text-[var(--text-300)]">
            No pending carbon verifications.
          </div>
        ) : null}

        {!loading &&
          activeTab === 'pending' &&
          records.map((approval) => {
            const timeline = getTimelineChips(
              'carbon',
              approval.verification_status || 'pending'
            );
            return (
              <div
                key={approval.approval_id}
                className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--text-300)]">Approval ID</p>
                    <p className="text-[var(--text-100)] font-semibold">{approval.approval_id}</p>
                  </div>
                  <span className="text-xs rounded-full bg-[var(--surface-700)] px-2.5 py-1 text-[var(--text-300)]">
                    {approval.approval_type || 'carbon_verification'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {timeline.map((chip) => (
                    <span
                      key={chip.status}
                      className={`px-2 py-1 rounded-full text-xs capitalize ${
                        chip.state === 'done'
                          ? 'bg-emerald-900/60 text-emerald-100'
                          : chip.state === 'current'
                            ? 'bg-[var(--accent-500)] text-[var(--text-100)]'
                            : 'bg-[var(--surface-700)] text-[var(--text-300)]'
                      }`}
                    >
                      {chip.status.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                <textarea
                  rows="2"
                  placeholder="Decision note (required for revision request)"
                  value={decisionNote[approval.approval_id] || ''}
                  onChange={(event) =>
                    setDecisionNote((prev) => ({
                      ...prev,
                      [approval.approval_id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] px-3 py-2 text-[var(--text-100)]"
                />

                <div className="grid sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => submitDecision(approval, 'verified')}
                    disabled={submittingId === approval.approval_id}
                    className="rounded-lg px-4 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-400)] text-[var(--text-100)] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Verify
                  </button>
                  <button
                    onClick={() => submitDecision(approval, 'revision_requested')}
                    disabled={submittingId === approval.approval_id}
                    className="rounded-lg px-4 py-2.5 border border-[var(--surface-700)] hover:bg-[var(--surface-700)] text-[var(--text-100)] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Request Revision
                  </button>
                </div>
              </div>
            );
          })}

        {activeTab === 'audit' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4">
            <h2 className="text-lg font-semibold text-[var(--text-100)]">EcoTrust Audit</h2>
            <p className="text-sm text-[var(--text-300)] mt-1">
              Audit transactions and flag suspicious entries for super admin review.
            </p>
          </div>
        ) : null}

        {activeTab === 'trends' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4">
            <h2 className="text-lg font-semibold text-[var(--text-100)]">Carbon Trends</h2>
            <p className="text-sm text-[var(--text-300)] mt-1">
              Compare estimated vs actual carbon metrics across completed deliveries.
            </p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default SustainabilityManagerPage;
