'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { verificationService } from '@/services/verificationService';
import { auditService } from '@/services/auditService';
import { PractitionerApplication, CredentialDocument } from '@/types/verification';
import { formatDate, formatTimeAgo, formatFileSize, getInitials } from '@/lib/utils';
import {
  FileText,
  Building2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
} from 'lucide-react';

export default function VerificationPage() {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [applications, setApplications] = useState<PractitionerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>(
    'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Selected for review
  const [selectedApp, setSelectedApp] = useState<PractitionerApplication | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeDocumentPreview, setActiveDocumentPreview] = useState<CredentialDocument | null>(
    null
  );

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectCategory, setRejectCategory] = useState<
    'invalid_pmdc' | 'expired_credentials' | 'name_mismatch' | 'forged_document' | 'other'
  >('invalid_pmdc');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await verificationService.getApplications(statusTab);
      setApplications(data);
    } catch {
      toastError('Error', 'Failed to load verification applications');
    } finally {
      setLoading(false);
    }
  }, [statusTab, toastError]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsSubmittingDecision(true);
    try {
      const updated = await verificationService.approveApplication(
        selectedApp.id,
        currentAdmin?.name || 'Admin',
        'Verified against PMDC active council registry.'
      );

      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelectedApp(updated);

      await auditService.logAction({
        actor: {
          id: currentAdmin?.id || 'admin',
          name: currentAdmin?.name || 'Admin',
          email: currentAdmin?.email || 'admin@healthdastaan.com',
          role: currentAdmin?.role || 'verification_admin',
          ipAddress: '127.0.0.1',
        },
        action: 'VERIFICATION_APPROVED',
        targetResource: `${selectedApp.userId}:${selectedApp.fullName}`,
        description: `Approved medical practitioner verification for ${selectedApp.fullName} (PMDC: ${selectedApp.pmdcNumber})`,
        severity: 'info',
        status: 'success',
        metadata: {
          pmdcNumber: selectedApp.pmdcNumber,
          specialization: selectedApp.specialization,
        },
      });

      success(
        'Practitioner Approved',
        `${selectedApp.fullName} has been granted clinical practice rights.`
      );
      setReviewModalOpen(false);
    } catch {
      toastError('Error', 'Failed to approve application');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!rejectReason.trim()) {
      toastError('Required', 'Please enter a rejection explanation for the doctor.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      const updated = await verificationService.rejectApplication(
        selectedApp.id,
        rejectReason,
        rejectCategory,
        currentAdmin?.name || 'Admin'
      );

      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelectedApp(updated);

      await auditService.logAction({
        actor: {
          id: currentAdmin?.id || 'admin',
          name: currentAdmin?.name || 'Admin',
          email: currentAdmin?.email || 'admin@healthdastaan.com',
          role: currentAdmin?.role || 'verification_admin',
          ipAddress: '127.0.0.1',
        },
        action: 'VERIFICATION_REJECTED',
        targetResource: `${selectedApp.userId}:${selectedApp.fullName}`,
        description: `Rejected practitioner application for ${selectedApp.fullName}. Category: ${rejectCategory}. Reason: ${rejectReason}`,
        severity: 'critical',
        status: 'success',
        metadata: {
          rejectionCategory: rejectCategory,
          reason: rejectReason,
        },
      });

      info(
        'Application Rejected',
        `The practitioner application for ${selectedApp.fullName} was rejected.`
      );
      setRejectModalOpen(false);
      setReviewModalOpen(false);
      setRejectReason('');
    } catch {
      toastError('Error', 'Failed to reject application');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.fullName.toLowerCase().includes(q) ||
      app.pmdcNumber.toLowerCase().includes(q) ||
      app.specialization.toLowerCase().includes(q) ||
      app.clinicHospitalName.toLowerCase().includes(q)
    );
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#002654] tracking-tight">
              Practitioner Credential Verification
            </h2>
            <p className="text-xs text-[#737781] mt-0.5">
              Review Pakistan Medical & Dental Council (PMDC) credentials, degrees, and hospital
              affiliations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 shadow-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending Review: <strong>{pendingCount}</strong>
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-[#F7F9FF] p-1 rounded-xl border border-slate-200/80">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  statusTab === tab
                    ? 'bg-white text-[#002654] shadow-sm'
                    : 'text-[#434750] hover:text-[#002654]'
                }`}
              >
                {tab === 'pending'
                  ? `Pending (${pendingCount})`
                  : tab === 'all'
                    ? 'All Applications'
                    : tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by doctor name, PMDC #, hospital..."
            className="md:w-80"
          />
        </div>

        {/* Application Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-16 text-center text-xs text-[#737781]">
              Loading practitioner credentials...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-[#737781]">
              No practitioner applications found under this status filter.
            </div>
          ) : (
            filteredApps.map((app) => {
              const isPending = app.status === 'pending';
              const isApproved = app.status === 'approved';

              return (
                <div
                  key={app.id}
                  className="relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] hover:shadow-[0_8px_24px_-4px_rgba(11,60,120,0.12)] transition-all flex flex-col justify-between"
                >
                  {/* Left-hand vertical clinical accent bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      isApproved ? 'bg-[#00875A]' : isPending ? 'bg-[#00A896]' : 'bg-[#BA1A1A]'
                    }`}
                  />

                  <div className="space-y-4 pl-1.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#002654] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {getInitials(app.fullName)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#121D27]">{app.fullName}</h4>
                          <p className="text-xs font-medium text-[#006B5F]">{app.specialization}</p>
                        </div>
                      </div>

                      <Badge
                        variant={isApproved ? 'verified' : isPending ? 'pending' : 'rejected'}
                        size="sm"
                        dot
                      >
                        {app.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Metadata details */}
                    <div className="space-y-2 text-xs text-[#434750]">
                      <div className="p-2.5 rounded-lg bg-[#F7F9FF] border border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#737781]">PMDC License:</span>
                          <span className="font-mono font-bold text-[#002654]">
                            {app.pmdcNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#737781]">Experience:</span>
                          <span className="font-semibold text-[#121D27]">
                            {app.yearsOfExperience} Years
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 text-[#434750]">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{app.clinicHospitalName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[#737781] text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submitted {formatTimeAgo(app.submittedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 pl-1.5">
                    <span className="text-[11px] text-[#737781]">
                      {app.documents.length} document(s) uploaded
                    </span>

                    <Button
                      variant={isPending ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedApp(app);
                        setReviewModalOpen(true);
                      }}
                      rightIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      {isPending ? 'Inspect & Verify' : 'View Credentials'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Full Credential Review Modal */}
        {selectedApp && (
          <Modal
            isOpen={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            title={`Practitioner Credential Review: ${selectedApp.fullName}`}
            subtitle={`PMDC Registration: ${selectedApp.pmdcNumber} • ${selectedApp.specialization}`}
            maxWidth="2xl"
            footer={
              <div className="flex items-center justify-between w-full">
                <div className="text-xs text-[#737781]">
                  Status: <strong className="text-[#002654] uppercase">{selectedApp.status}</strong>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedApp.status === 'pending' ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRejectModalOpen(true)}
                        leftIcon={<XCircle className="w-4 h-4" />}
                        disabled={isSubmittingDecision}
                      >
                        Reject Application
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleApprove}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        isLoading={isSubmittingDecision}
                      >
                        Approve PMDC Credentials
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                      Close
                    </Button>
                  )}
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Doctor Highlights */}
              <div className="p-4 rounded-xl bg-[#F7F9FF] border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#737781]">Medical Council Registry</p>
                  <p className="font-bold text-[#002654] text-sm mt-0.5">
                    {selectedApp.medicalCouncilState}
                  </p>
                </div>
                <div>
                  <p className="text-[#737781]">Hospital / Clinical Base</p>
                  <p className="font-bold text-[#121D27] text-sm mt-0.5">
                    {selectedApp.clinicHospitalName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{selectedApp.clinicAddress}</p>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-slate-200">
                  <p className="text-[#737781] mb-1">Degrees & Specializations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.qualifications.map((qual, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-[#002654]"
                      >
                        {qual}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedApp.notes && (
                  <div className="md:col-span-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                    <p className="font-bold text-xs">Applicant Clinical Note:</p>
                    <p className="text-xs mt-0.5">{selectedApp.notes}</p>
                  </div>
                )}
              </div>

              {/* Uploaded Documents Preview Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#002654]">
                    Submitted Verification Documents ({selectedApp.documents.length})
                  </h4>
                  <span className="text-[11px] text-[#737781]">Click document to inspect file</span>
                </div>

                {selectedApp.documents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#737781] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No documents attached for this application.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedApp.documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setActiveDocumentPreview(doc)}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#00A896] hover:bg-[#EDF4FF]/50 transition-all cursor-pointer flex items-start gap-3 group"
                      >
                        <div className="p-2.5 rounded-lg bg-[#002654]/10 text-[#002654] group-hover:bg-[#00A896]/20 group-hover:text-[#006B5F] shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#121D27] truncate group-hover:text-[#002654]">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-[#737781] mt-0.5">
                            {formatFileSize(doc.fileSizeBytes)} • {formatDate(doc.uploadedAt)}
                          </p>
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ready for Review
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Embedded Document Lightbox Viewer */}
              {activeDocumentPreview && (
                <div className="p-4 rounded-xl border border-[#00A896]/30 bg-[#EDF4FF]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#00A896]" />
                      <span className="text-xs font-bold text-[#002654]">
                        Viewing: {activeDocumentPreview.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveDocumentPreview(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Close Viewer
                    </button>
                  </div>

                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <img
                      src={activeDocumentPreview.fileUrl}
                      alt={activeDocumentPreview.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-[#002654]/80 text-white text-[11px] backdrop-blur-sm">
                      Verified Document Archive Preview
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Reject Modal With Mandatory Reason and Category */}
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Practitioner Credentials"
          subtitle={`Reason required for rejecting Dr. ${selectedApp?.fullName}`}
          maxWidth="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
                disabled={isSubmittingDecision}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReject}
                isLoading={isSubmittingDecision}
              >
                Confirm Rejection
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#BA1A1A] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>
                Rejecting this application will send a formal notification to the doctor with your
                rejection explanation and keep their account restricted from practicing on
                HealthDastaan.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434750]">
                Rejection Category <span className="text-red-500">*</span>
              </label>
              <select
                value={rejectCategory}
                onChange={(e) => setRejectCategory(e.target.value as typeof rejectCategory)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#00A896]"
              >
                <option value="invalid_pmdc">Invalid or Unregistered PMDC License Number</option>
                <option value="expired_credentials">Expired Medical License or Registration</option>
                <option value="name_mismatch">
                  Name Mismatch between CNIC and PMDC Certificate
                </option>
                <option value="forged_document">Tampered or Fraudulent Document Upload</option>
                <option value="other">Other Credential Discrepancy</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#434750]">
                Detailed Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. The provided PMDC registration (89102-S) expired on Dec 2024. Please re-upload current renewal slip..."
                className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#00A896]"
                required
              />
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
