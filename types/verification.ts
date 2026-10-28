export type VerificationDocumentType =
  | 'pmdc_license'
  | 'mbbs_degree'
  | 'fcps_specialization'
  | 'cnic_front_back'
  | 'hospital_affiliation_letter';

export interface CredentialDocument {
  id: string;
  name: string;
  type: VerificationDocumentType;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
  status: 'valid' | 'expired' | 'suspicious' | 'pending_review';
  metadata?: {
    expiryDate?: string;
    issuingAuthority?: string;
  };
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'in_review';

export interface PractitionerApplication {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  pmdcNumber: string;
  specialization: string;
  subSpecialization?: string;
  qualifications: string[];
  medicalCouncilState: string;
  clinicHospitalName: string;
  clinicAddress: string;
  yearsOfExperience: number;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  rejectionReason?: string;
  rejectionCategory?:
    'invalid_pmdc' | 'expired_credentials' | 'name_mismatch' | 'forged_document' | 'other';
  documents: CredentialDocument[];
  notes?: string;
}
