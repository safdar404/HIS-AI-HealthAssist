// Clinical Profile Synchronization Service
// Manages synchronized clinician profiles, hospital facilities, and digital signature stamps across all modules

import { DUTY_DOCTORS_ROSTER } from '../data/dutyDoctorsData';

export interface ClinicianProfile {
  id: string;
  name: string;
  qualifications: string;
  specialty: string;
  roleTitle: string;
  licenseNo: string; // PMDC Registration
  signatureText: string;
  signatureStyle: 'classic' | 'modern' | 'formal' | 'flourish' | 'bold';
  signatureInkColor: string; // e.g. '#1e3a8a'
  signatureFlourishFactor: number;
  contactEmail?: string;
  contactPhone?: string;
  hospitalId?: string;
  hospitalName?: string;
  themePreference?: 'light' | 'dark';
}

export interface HospitalFacility {
  id: string;
  name: string;
  shortName: string;
  district: string;
  province: string;
  facilityType: 'Tertiary Care Hospital' | 'DHQ Emergency Center' | 'Tele-Triage Node' | 'Teaching Hospital' | 'Cardiology Institute' | 'Primary Care Clinic';
  facilityCode: string;
  sealInitials: string;
  address: string;
  helpline: string;
}

export const PRESET_DOCTORS: ClinicianProfile[] = [
  // 1. JPMC Karachi
  {
    id: 'doc-asim-farooq',
    name: 'Dr. Asim Farooq',
    qualifications: 'MBBS, MD, FCPS (Cardiology), MRCP (UK)',
    specialty: 'Cardiovascular Medicine & Hypertension',
    roleTitle: 'Chief Consultant Cardiologist',
    licenseNo: 'PMDC-58921-P',
    signatureText: 'Dr. Asim Farooq',
    signatureStyle: 'classic',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.0,
    contactEmail: 'asim.farooq@healthassist.gov.pk',
    hospitalId: 'HOSP-JPMC-KHI',
    hospitalName: 'JPMC Karachi',
  },
  {
    id: 'doc-maryam-siddiqui',
    name: 'Dr. Maryam Siddiqui',
    qualifications: 'MBBS, FCPS (Emergency Medicine), MCPS',
    specialty: 'Emergency Medicine & Level 1 Trauma',
    roleTitle: 'Senior Registrar - Emergency Medicine',
    licenseNo: 'PMDC-73190-S',
    signatureText: 'Dr. Maryam Siddiqui',
    signatureStyle: 'modern',
    signatureInkColor: '#0f172a',
    signatureFlourishFactor: 1.1,
    contactEmail: 'maryam.siddiqui@jpmc.gov.pk',
    hospitalId: 'HOSP-JPMC-KHI',
    hospitalName: 'JPMC Karachi',
  },

  // 2. Mayo Hospital Lahore
  {
    id: 'doc-haroon-babar',
    name: 'Prof. Dr. Haroon Babar',
    qualifications: 'MBBS (KE), FCPS (Medicine), FRCP (Edin)',
    specialty: 'Internal Medicine & Pulmonology',
    roleTitle: 'Professor & Head of Department of Medicine',
    licenseNo: 'PMDC-44520-P',
    signatureText: 'Prof. Dr. Haroon Babar',
    signatureStyle: 'formal',
    signatureInkColor: '#1e293b',
    signatureFlourishFactor: 0.9,
    contactEmail: 'haroon.babar@kemu.edu.pk',
    hospitalId: 'HOSP-MAYO-LHR',
    hospitalName: 'Mayo Hospital Lahore',
  },
  {
    id: 'doc-bilal-tahir-gondal',
    name: 'Dr. Bilal Tahir Gondal',
    qualifications: 'MBBS, FCPS (Orthopedic Surgery), AO Trauma Fellow',
    specialty: 'Orthopedics & Polytrauma',
    roleTitle: 'Senior Registrar - Trauma & Orthopedics',
    licenseNo: 'PMDC-79201-P',
    signatureText: 'Dr. Bilal Gondal',
    signatureStyle: 'bold',
    signatureInkColor: '#0f2744',
    signatureFlourishFactor: 1.0,
    contactEmail: 'bilal.gondal@mayo.punjab.gov.pk',
    hospitalId: 'HOSP-MAYO-LHR',
    hospitalName: 'Mayo Hospital Lahore',
  },

  // 3. Jinnah Hospital Lahore
  {
    id: 'doc-tahir-shafi',
    name: 'Prof. Dr. Tahir Shafi',
    qualifications: 'MBBS, FCPS, FRCP (Glasg), FASN',
    specialty: 'Nephrology & Renal Medicine',
    roleTitle: 'Professor & Head of Nephrology & Renal Transplant',
    licenseNo: 'PMDC-38102-P',
    signatureText: 'Prof. Tahir Shafi',
    signatureStyle: 'formal',
    signatureInkColor: '#172554',
    signatureFlourishFactor: 0.9,
    contactEmail: 'tahir.shafi@aimc.edu.pk',
    hospitalId: 'HOSP-JINNAH-LHR',
    hospitalName: 'Jinnah Hospital Lahore',
  },

  // 4. Punjab Institute of Cardiology (PIC) Lahore
  {
    id: 'doc-salman-ahmad-chatha',
    name: 'Dr. Salman Ahmad Chatha',
    qualifications: 'MBBS, FCPS (Cardiology), Fellowship Interventional (USA)',
    specialty: 'Cardiology & Interventional Coronary Care',
    roleTitle: 'Consultant Interventional Cardiologist',
    licenseNo: 'PMDC-56189-P',
    signatureText: 'Dr. Salman Chatha',
    signatureStyle: 'flourish',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.2,
    contactEmail: 'salman.chatha@pic.gov.pk',
    hospitalId: 'HOSP-PIC-LHR',
    hospitalName: 'Punjab Institute of Cardiology (PIC)',
  },

  // 5. Services Hospital Lahore
  {
    id: 'doc-sajid-nisar',
    name: 'Prof. Dr. Sajid Nisar',
    qualifications: 'MBBS, FCPS (Medicine), FRCP, FACE (USA)',
    specialty: 'Endocrinology & Diabetology',
    roleTitle: 'Professor & Head of Endocrinology & Metabolism',
    licenseNo: 'PMDC-42310-P',
    signatureText: 'Prof. Dr. Sajid Nisar',
    signatureStyle: 'classic',
    signatureInkColor: '#0f172a',
    signatureFlourishFactor: 1.0,
    contactEmail: 'sajid.nisar@sims.edu.pk',
    hospitalId: 'HOSP-SERVICES-LHR',
    hospitalName: 'Services Hospital Lahore',
  },

  // 6. Nishtar Hospital Multan
  {
    id: 'doc-ghulam-mustafa-arain',
    name: 'Prof. Dr. Ghulam Mustafa Arain',
    qualifications: 'MBBS (Nishtar), FCPS (Surgery), FRCS (Edin)',
    specialty: 'General & Vascular Surgery',
    roleTitle: 'Professor & Head of Surgery & Trauma',
    licenseNo: 'PMDC-37920-P',
    signatureText: 'Prof. Dr. G. M. Arain',
    signatureStyle: 'formal',
    signatureInkColor: '#1e293b',
    signatureFlourishFactor: 0.9,
    contactEmail: 'mustafa.arain@nmu.edu.pk',
    hospitalId: 'HOSP-NISHTAR-MUL',
    hospitalName: 'Nishtar Hospital Multan',
  },

  // 7. Allied Hospital Faisalabad
  {
    id: 'doc-zahid-yasin-hashmi',
    name: 'Prof. Dr. Zahid Yasin Hashmi',
    qualifications: 'MBBS, FCPS (Cardiology), FACC',
    specialty: 'Cardiology & Intensive Care',
    roleTitle: 'Professor & Head of Department of Cardiology',
    licenseNo: 'PMDC-41098-P',
    signatureText: 'Prof. Zahid Y. Hashmi',
    signatureStyle: 'bold',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.1,
    contactEmail: 'zahid.hashmi@fmu.edu.pk',
    hospitalId: 'HOSP-ALLIED-FSD',
    hospitalName: 'Allied Hospital Faisalabad',
  },

  // 8. Holy Family Hospital Rawalpindi
  {
    id: 'doc-muhammad-umar',
    name: 'Prof. Dr. Muhammad Umar',
    qualifications: 'MBBS, FCPS (Medicine), FRCP (Lond), FACG',
    specialty: 'Internal Medicine & Gastroenterology',
    roleTitle: 'Vice Chancellor RMU & Senior Consultant Internist',
    licenseNo: 'PMDC-35140-P',
    signatureText: 'Prof. Dr. M. Umar',
    signatureStyle: 'flourish',
    signatureInkColor: '#0f172a',
    signatureFlourishFactor: 1.3,
    contactEmail: 'm.umar@rmur.edu.pk',
    hospitalId: 'HOSP-HOLY-FAMILY-RWP',
    hospitalName: 'Holy Family Hospital Rawalpindi',
  },

  // 9. NICVD Karachi
  {
    id: 'doc-nadeem-qamar',
    name: 'Prof. Dr. Nadeem Qamar',
    qualifications: 'MBBS, FCPS, FACC, FSCAI',
    specialty: 'Interventional Cardiology & Primary PCI',
    roleTitle: 'Executive Director & Professor of Cardiology',
    licenseNo: 'PMDC-31045-S',
    signatureText: 'Prof. Nadeem Qamar',
    signatureStyle: 'classic',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.1,
    contactEmail: 'nadeem.qamar@nicvd.org',
    hospitalId: 'HOSP-NICVD-KHI',
    hospitalName: 'NICVD Karachi',
  },

  // 10. Civil Hospital Karachi
  {
    id: 'doc-saeed-quraishy',
    name: 'Prof. Dr. Saeed Quraishy',
    qualifications: 'MBBS (SMC), FCPS, FRCS (Glasg)',
    specialty: 'General & Colorectal Surgery',
    roleTitle: 'Professor of Surgery & Former Vice Chancellor DUHS',
    licenseNo: 'PMDC-32910-S',
    signatureText: 'Prof. Saeed Quraishy',
    signatureStyle: 'formal',
    signatureInkColor: '#0f2744',
    signatureFlourishFactor: 0.8,
    contactEmail: 'saeed.quraishy@duhs.edu.pk',
    hospitalId: 'HOSP-CIVIL-KHI',
    hospitalName: 'Dr. Ruth Pfau Civil Hospital Karachi',
  },

  // 11. Liaquat University Hospital Hyderabad
  {
    id: 'doc-bikha-ram',
    name: 'Prof. Dr. Bikha Ram Devrajani',
    qualifications: 'MBBS, FCPS (Medicine), FRCP (Glasg)',
    specialty: 'Internal Medicine & Chronic Disease',
    roleTitle: 'Senior Consultant & Professor of Medicine',
    licenseNo: 'PMDC-36812-S',
    signatureText: 'Prof. Bikha Ram',
    signatureStyle: 'classic',
    signatureInkColor: '#172554',
    signatureFlourishFactor: 1.0,
    contactEmail: 'bikharam@lumhs.edu.pk',
    hospitalId: 'HOSP-LUH-HYD',
    hospitalName: 'Liaquat University Hospital Hyderabad',
  },

  // 12. Gambat Institute of Medical Sciences (GIMS)
  {
    id: 'doc-rahim-bux-bhatti',
    name: 'Dr. Rahim Bux Bhatti',
    qualifications: 'MBBS, FCPS, FRCS',
    specialty: 'Liver & Organ Transplantation',
    roleTitle: 'Director & Chief Transplant Surgeon',
    licenseNo: 'PMDC-31980-S',
    signatureText: 'Dr. R. B. Bhatti',
    signatureStyle: 'bold',
    signatureInkColor: '#047857',
    signatureFlourishFactor: 1.0,
    contactEmail: 'rb.bhatti@gims.edu.pk',
    hospitalId: 'HOSP-GIMS-GAMBAT',
    hospitalName: 'GIMS Gambat',
  },

  // 13. PIMS Islamabad
  {
    id: 'doc-khawaja-farhan',
    name: 'Dr. Khawaja Farhan',
    qualifications: 'MBBS, FCPS (Pulmonology), EDIC Critical Care',
    specialty: 'Pulmonology & Intensive Care',
    roleTitle: 'Chief Critical Care & Pulmonologist',
    licenseNo: 'PMDC-61099-I',
    signatureText: 'Dr. K. Farhan',
    signatureStyle: 'modern',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.0,
    contactEmail: 'k.farhan@pims.gov.pk',
    hospitalId: 'HOSP-PIMS-ISB',
    hospitalName: 'PIMS Islamabad',
  },

  // 14. FGPC Polyclinic Islamabad
  {
    id: 'doc-inam-ul-haq-qureshi',
    name: 'Dr. Inam-ul-Haq Qureshi',
    qualifications: 'MBBS, FCPS (Internal Medicine), MCPS',
    specialty: 'Internal Medicine & Emergency',
    roleTitle: 'Head of Emergency Medicine & Senior Consultant',
    licenseNo: 'PMDC-49821-I',
    signatureText: 'Dr. Inam Qureshi',
    signatureStyle: 'formal',
    signatureInkColor: '#0f172a',
    signatureFlourishFactor: 0.9,
    contactEmail: 'inam.qureshi@polyclinic.gov.pk',
    hospitalId: 'HOSP-POLYCLINIC-ISB',
    hospitalName: 'FGPC Polyclinic Islamabad',
  },

  // 15. Lady Reading Hospital (LRH) Peshawar
  {
    id: 'doc-zahid-ullah-khan',
    name: 'Dr. Zahid Ullah Khan',
    qualifications: 'MBBS, FCPS (General Surgery), FACS',
    specialty: 'Trauma & Emergency Surgery',
    roleTitle: 'Director Emergency & Senior Trauma Surgeon',
    licenseNo: 'PMDC-51908-K',
    signatureText: 'Dr. Zahid U. Khan',
    signatureStyle: 'bold',
    signatureInkColor: '#1e293b',
    signatureFlourishFactor: 1.0,
    contactEmail: 'zahid.khan@lrh.edu.pk',
    hospitalId: 'HOSP-LRH-PEW',
    hospitalName: 'Lady Reading Hospital (LRH) Peshawar',
  },

  // 16. Khyber Teaching Hospital (KTH) Peshawar
  {
    id: 'doc-hashim-uddin-azam',
    name: 'Prof. Dr. Hashim Uddin Azam',
    qualifications: 'MBBS (KMC), FCPS (Medicine), FRCP (Edin)',
    specialty: 'Internal Medicine & Diabetology',
    roleTitle: 'Professor & Head of Department of Medicine',
    licenseNo: 'PMDC-41209-K',
    signatureText: 'Prof. Hashim Azam',
    signatureStyle: 'classic',
    signatureInkColor: '#172554',
    signatureFlourishFactor: 1.1,
    contactEmail: 'hashim.azam@kmc.edu.pk',
    hospitalId: 'HOSP-KTH-PEW',
    hospitalName: 'Khyber Teaching Hospital (KTH) Peshawar',
  },

  // 17. Hayatabad Medical Complex (HMC) Peshawar
  {
    id: 'doc-shehzad-akbar',
    name: 'Prof. Dr. Shehzad Akbar Khan',
    qualifications: 'MBBS, FCPS (Paediatric Surgery), FRCS',
    specialty: 'Pediatric Surgery & Critical Care',
    roleTitle: 'Medical Director & Professor of Pediatric Surgery',
    licenseNo: 'PMDC-46380-K',
    signatureText: 'Prof. Shehzad Akbar',
    signatureStyle: 'formal',
    signatureInkColor: '#0f2744',
    signatureFlourishFactor: 0.9,
    contactEmail: 'shehzad.akbar@hmc.org.pk',
    hospitalId: 'HOSP-HMC-PEW',
    hospitalName: 'Hayatabad Medical Complex (HMC) Peshawar',
  },

  // 18. Bolan Medical Complex Hospital Quetta
  {
    id: 'doc-mir-dost-mohammad',
    name: 'Dr. Mir Dost Mohammad Baloch',
    qualifications: 'MBBS, FCPS (Cardiology), MCPS',
    specialty: 'Cardiology & CCU Management',
    roleTitle: 'Head of Department of Cardiology',
    licenseNo: 'PMDC-48231-B',
    signatureText: 'Dr. Mir Dost Baloch',
    signatureStyle: 'flourish',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.2,
    contactEmail: 'dost.baloch@bumhs.edu.pk',
    hospitalId: 'HOSP-BMCH-QTA',
    hospitalName: 'BMCH Quetta',
  },

  // 19. Sandeman Civil Hospital Quetta
  {
    id: 'doc-noor-ullah-mengal',
    name: 'Dr. Noor Ullah Mengal',
    qualifications: 'MBBS, FCPS (Medicine), DTCD',
    specialty: 'Pulmonology & Infectious Diseases',
    roleTitle: 'Senior Consultant Physician & Chest Lead',
    licenseNo: 'PMDC-45091-B',
    signatureText: 'Dr. Noor Mengal',
    signatureStyle: 'classic',
    signatureInkColor: '#0f172a',
    signatureFlourishFactor: 0.9,
    contactEmail: 'noor.mengal@health.gob.pk',
    hospitalId: 'HOSP-CIVIL-QTA',
    hospitalName: 'Civil Hospital Quetta',
  },

  // 20. Aga Khan University Hospital (AKUH)
  {
    id: 'doc-sanaullah-jamali',
    name: 'Dr. Sanaullah Jamali',
    qualifications: 'MBBS, FCPS (Emergency Medicine), MRCEM (UK)',
    specialty: 'Emergency Medicine & Resuscitation',
    roleTitle: 'Consultant & Section Head of Emergency Medicine',
    licenseNo: 'PMDC-62988-S',
    signatureText: 'Dr. Sanaullah Jamali',
    signatureStyle: 'modern',
    signatureInkColor: '#1e3a8a',
    signatureFlourishFactor: 1.1,
    contactEmail: 'sanaullah.jamali@aku.edu',
    hospitalId: 'HOSP-AKUH-KHI',
    hospitalName: 'Aga Khan University Hospital (AKUH)',
  },

  // 21. Shaukat Khanum Cancer Hospital (SKMCH)
  {
    id: 'doc-faisal-sultan',
    name: 'Prof. Dr. Faisal Sultan',
    qualifications: 'MBBS, Diplomat ABIM, Diplomat Infectious Diseases',
    specialty: 'Infectious Diseases & Internal Medicine',
    roleTitle: 'Senior Consultant & Clinical Director',
    licenseNo: 'PMDC-34901-P',
    signatureText: 'Prof. Faisal Sultan',
    signatureStyle: 'formal',
    signatureInkColor: '#0f2744',
    signatureFlourishFactor: 0.9,
    contactEmail: 'faisal.sultan@skm.org.pk',
    hospitalId: 'HOSP-SKMCH-LHR',
    hospitalName: 'Shaukat Khanum Memorial Cancer Hospital',
  },

  // 22. Indus Hospital Karachi
  {
    id: 'doc-abdul-bari-khan',
    name: 'Prof. Dr. Abdul Bari Khan',
    qualifications: 'MBBS (Dow), FCPS (Cardiac Surgery), Tamgha-e-Imtiaz',
    specialty: 'Cardiac Surgery & Free Healthcare Leadership',
    roleTitle: 'Founder, President & Senior Cardiac Surgeon',
    licenseNo: 'PMDC-31290-S',
    signatureText: 'Prof. Abdul Bari Khan',
    signatureStyle: 'classic',
    signatureInkColor: '#047857',
    signatureFlourishFactor: 1.2,
    contactEmail: 'abdulbari.khan@tih.org.pk',
    hospitalId: 'HOSP-INDUS-KHI',
    hospitalName: 'Indus Hospital & Health Network',
  },
];

export const PRESET_HOSPITALS: HospitalFacility[] = [
  // --- PUNJAB ---
  {
    id: 'HOSP-MAYO-LHR',
    name: 'Mayo Hospital Lahore - Primary Care & CDS Center',
    shortName: 'Mayo Hospital Lahore',
    district: 'Lahore',
    province: 'Punjab',
    facilityType: 'Teaching Hospital',
    facilityCode: 'MHL-PUNJAB-01',
    sealInitials: 'MHL',
    address: 'Nila Gumbad, Anarkali Bazaar, Lahore, Punjab',
    helpline: '+92-42-99211100',
  },
  {
    id: 'HOSP-JINNAH-LHR',
    name: 'Jinnah Hospital Lahore - Burn & Tertiary Referral Center',
    shortName: 'Jinnah Hospital Lahore',
    district: 'Lahore',
    province: 'Punjab',
    facilityType: 'Teaching Hospital',
    facilityCode: 'JHL-PUNJAB-02',
    sealInitials: 'JHL',
    address: 'Usmani Road, Quaid-e-Azam Campus, Faisal Town, Lahore',
    helpline: '+92-42-99231400',
  },
  {
    id: 'HOSP-PIC-LHR',
    name: 'Punjab Institute of Cardiology (PIC) - Emergency Angioplasty Center',
    shortName: 'PIC Lahore',
    district: 'Lahore',
    province: 'Punjab',
    facilityType: 'Cardiology Institute',
    facilityCode: 'PIC-PUNJAB-03',
    sealInitials: 'PIC',
    address: 'Ghaus-ul-Azam (Jail) Road, Shadman II, Lahore, Punjab',
    helpline: '+92-42-99203051',
  },
  {
    id: 'HOSP-SERVICES-LHR',
    name: 'Services Hospital Lahore - SIMS Endocrine & Metabolic Center',
    shortName: 'Services Hospital Lahore',
    district: 'Lahore',
    province: 'Punjab',
    facilityType: 'Teaching Hospital',
    facilityCode: 'SHL-PUNJAB-04',
    sealInitials: 'SHL',
    address: 'Ghaus-ul-Azam Road (Jail Road), Lahore, Punjab',
    helpline: '+92-42-99203402',
  },
  {
    id: 'HOSP-NISHTAR-MUL',
    name: 'Nishtar Hospital Multan - South Punjab Regional Hub',
    shortName: 'Nishtar Hospital Multan',
    district: 'Multan',
    province: 'Punjab',
    facilityType: 'Teaching Hospital',
    facilityCode: 'NHM-PUNJAB-05',
    sealInitials: 'NHM',
    address: 'Nishtar Road, Gillani Colony, Multan, South Punjab',
    helpline: '+92-61-9200231',
  },
  {
    id: 'HOSP-ALLIED-FSD',
    name: 'Allied Hospital Faisalabad - Central Punjab Trauma Hub',
    shortName: 'Allied Hospital Faisalabad',
    district: 'Faisalabad',
    province: 'Punjab',
    facilityType: 'Teaching Hospital',
    facilityCode: 'AHF-PUNJAB-06',
    sealInitials: 'AHF',
    address: 'Jail Road, near Agriculture University, Faisalabad',
    helpline: '+92-41-9210082',
  },
  {
    id: 'HOSP-HOLY-FAMILY-RWP',
    name: 'Holy Family Hospital Rawalpindi - Maternal & Child Health Hub',
    shortName: 'Holy Family Hospital Rawalpindi',
    district: 'Rawalpindi',
    province: 'Punjab',
    facilityType: 'Teaching Hospital',
    facilityCode: 'HFH-PUNJAB-07',
    sealInitials: 'HFH',
    address: 'Satellite Town, Block F, Rawalpindi, Punjab',
    helpline: '+92-51-9290321',
  },
  {
    id: 'HOSP-SKMCH-LHR',
    name: 'Shaukat Khanum Memorial Cancer Hospital & Research Centre',
    shortName: 'SKMCH Lahore',
    district: 'Lahore',
    province: 'Punjab',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'SKM-PUNJAB-08',
    sealInitials: 'SKM',
    address: '7A Block R-3, Johar Town, Lahore, Punjab',
    helpline: '+92-42-35905000',
  },

  // --- SINDH ---
  {
    id: 'HOSP-JPMC-KHI',
    name: 'Jinnah Postgraduate Medical Centre (JPMC) - Tele-Triage Hub',
    shortName: 'JPMC Karachi',
    district: 'Karachi South',
    province: 'Sindh',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'JPMC-SINDH-01',
    sealInitials: 'JPMC',
    address: 'Rafiqui Shaheed Road, Karachi Cantonment, Sindh',
    helpline: '+92-21-99201300',
  },
  {
    id: 'HOSP-NICVD-KHI',
    name: 'National Institute of Cardiovascular Diseases (NICVD) - Tele-Cardiology',
    shortName: 'NICVD Karachi',
    district: 'Karachi South',
    province: 'Sindh',
    facilityType: 'Cardiology Institute',
    facilityCode: 'NICVD-SINDH-02',
    sealInitials: 'NICVD',
    address: 'Rafiqui Shaheed Road, Karachi Cantonment, Karachi',
    helpline: '+92-21-99201271',
  },
  {
    id: 'HOSP-CIVIL-KHI',
    name: 'Dr. Ruth K.M. Pfau Civil Hospital Karachi - Trauma & Burns Center',
    shortName: 'Civil Hospital Karachi',
    district: 'Karachi South',
    province: 'Sindh',
    facilityType: 'Teaching Hospital',
    facilityCode: 'CHK-SINDH-03',
    sealInitials: 'CHK',
    address: 'Baba-e-Urdu Road, Saddar Town, Karachi, Sindh',
    helpline: '+92-21-99215740',
  },
  {
    id: 'HOSP-AKUH-KHI',
    name: 'Aga Khan University Hospital (AKUH) - JCIA Accredited Center',
    shortName: 'AKUH Karachi',
    district: 'Karachi East',
    province: 'Sindh',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'AKUH-SINDH-04',
    sealInitials: 'AKUH',
    address: 'National Stadium Road, Karachi, Sindh',
    helpline: '+92-21-34861090',
  },
  {
    id: 'HOSP-INDUS-KHI',
    name: 'Indus Hospital & Health Network - Free Healthcare Network',
    shortName: 'Indus Hospital Karachi',
    district: 'Korangi',
    province: 'Sindh',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'IHN-SINDH-05',
    sealInitials: 'IHN',
    address: 'Plot C-76, Sector 31/5, Opposite Darussalam Society, Korangi Crossing, Karachi',
    helpline: '+92-21-111-111-446',
  },
  {
    id: 'HOSP-LUH-HYD',
    name: 'Liaquat University Hospital Hyderabad / Jamshoro',
    shortName: 'LUH Hyderabad',
    district: 'Hyderabad',
    province: 'Sindh',
    facilityType: 'Teaching Hospital',
    facilityCode: 'LUH-SINDH-06',
    sealInitials: 'LUH',
    address: 'Hospital Road, Saddar, Hyderabad & Jamshoro Campus',
    helpline: '+92-22-9210207',
  },
  {
    id: 'HOSP-GIMS-GAMBAT',
    name: 'Gambat Institute of Medical Sciences (GIMS) - Organ Transplant Hub',
    shortName: 'GIMS Gambat',
    district: 'Khairpur',
    province: 'Sindh',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'GIMS-SINDH-07',
    sealInitials: 'GIMS',
    address: 'National Highway N-5, Gambat, District Khairpur, Sindh',
    helpline: '+92-243-720444',
  },

  // --- ISLAMABAD CAPITAL TERRITORY (ICT) ---
  {
    id: 'HOSP-PIMS-ISB',
    name: 'Pakistan Institute of Medical Sciences (PIMS) - Federal NCD Hub',
    shortName: 'PIMS Islamabad',
    district: 'Islamabad',
    province: 'Islamabad Capital Territory',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'PIMS-ICT-01',
    sealInitials: 'PIMS',
    address: 'Sector G-8/3, Islamabad, ICT',
    helpline: '+92-51-9261170',
  },
  {
    id: 'HOSP-POLYCLINIC-ISB',
    name: 'Federal Government Polyclinic (FGPC) Islamabad',
    shortName: 'FGPC Polyclinic Islamabad',
    district: 'Islamabad',
    province: 'Islamabad Capital Territory',
    facilityType: 'Tertiary Care Hospital',
    facilityCode: 'FGPC-ICT-02',
    sealInitials: 'FGPC',
    address: 'Luqman Hakeem Road, Sector G-6/2, Islamabad, ICT',
    helpline: '+92-51-9218300',
  },

  // --- KHYBER PAKHTUNKHWA (KP) ---
  {
    id: 'HOSP-LRH-PEW',
    name: 'Lady Reading Hospital (LRH) MTI - Central Level 1 Trauma Center',
    shortName: 'Lady Reading Hospital Peshawar',
    district: 'Peshawar',
    province: 'Khyber Pakhtunkhwa',
    facilityType: 'Teaching Hospital',
    facilityCode: 'LRH-KP-01',
    sealInitials: 'LRH',
    address: 'Pipal Mandi, Soekarno Square, Peshawar, Khyber Pakhtunkhwa',
    helpline: '+92-91-9211430',
  },
  {
    id: 'HOSP-KTH-PEW',
    name: 'Khyber Teaching Hospital (KTH) MTI Peshawar',
    shortName: 'KTH Peshawar',
    district: 'Peshawar',
    province: 'Khyber Pakhtunkhwa',
    facilityType: 'Teaching Hospital',
    facilityCode: 'KTH-KP-02',
    sealInitials: 'KTH',
    address: 'University Road, Jamrud Road, Peshawar, Khyber Pakhtunkhwa',
    helpline: '+92-91-9224400',
  },
  {
    id: 'HOSP-HMC-PEW',
    name: 'Hayatabad Medical Complex (HMC) MTI Peshawar',
    shortName: 'HMC Peshawar',
    district: 'Peshawar',
    province: 'Khyber Pakhtunkhwa',
    facilityType: 'Teaching Hospital',
    facilityCode: 'HMC-KP-03',
    sealInitials: 'HMC',
    address: 'Phase 4, Hayatabad, Peshawar, Khyber Pakhtunkhwa',
    helpline: '+92-91-9217140',
  },

  // --- BALOCHISTAN ---
  {
    id: 'HOSP-BMCH-QTA',
    name: 'Bolan Medical Complex Hospital (BMCH) - Balochistan NCD Hub',
    shortName: 'BMCH Quetta',
    district: 'Quetta',
    province: 'Balochistan',
    facilityType: 'Teaching Hospital',
    facilityCode: 'BMCH-BAL-01',
    sealInitials: 'BMCH',
    address: 'Brewery Road, Quetta, Balochistan',
    helpline: '+92-81-9213070',
  },
  {
    id: 'HOSP-CIVIL-QTA',
    name: 'Sandeman Provincial Hospital (Civil Hospital) Quetta',
    shortName: 'Civil Hospital Quetta',
    district: 'Quetta',
    province: 'Balochistan',
    facilityType: 'Teaching Hospital',
    facilityCode: 'CHQ-BAL-02',
    sealInitials: 'CHQ',
    address: 'Jinnah Road, Quetta, Balochistan',
    helpline: '+92-81-9202021',
  },
];

// Helper to normalize doctor names by removing titles and punctuation
const normalizeDoctorName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/^(prof\.|prof|dr\.|dr|mr\.|mrs\.|ms\.)\s+/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to normalize hospital names
const normalizeHospitalName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/^(dr\.|prof\.|hospital|teaching hospital|institute)\s+/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to get all registered clinicians (combining presets and duty roster)
export const getAllRegisteredClinicians = (): ClinicianProfile[] => {
  const clinicianMap = new Map<string, ClinicianProfile>();

  // 1. Add preset doctors first
  PRESET_DOCTORS.forEach((doc) => {
    clinicianMap.set(doc.id, doc);
  });

  // 2. Add duty roster doctors
  DUTY_DOCTORS_ROSTER.forEach((dutyDoc) => {
    const pmdcClean = dutyDoc.pmdcNumber.startsWith('PMDC') ? dutyDoc.pmdcNumber : `PMDC-${dutyDoc.pmdcNumber}`;
    // Check if already in presets by PMDC
    const alreadyInPresets = PRESET_DOCTORS.some((p) => p.licenseNo === pmdcClean || p.name === dutyDoc.name);
    if (!alreadyInPresets) {
      const dutyProfile: ClinicianProfile = {
        id: `duty-${dutyDoc.id}`,
        name: dutyDoc.name,
        qualifications: dutyDoc.qualifications,
        specialty: dutyDoc.specialty,
        roleTitle: dutyDoc.title,
        licenseNo: pmdcClean,
        signatureText: dutyDoc.name,
        signatureStyle: 'classic',
        signatureInkColor: '#1e3a8a',
        signatureFlourishFactor: 1.0,
        contactEmail: `${dutyDoc.name.toLowerCase().replace(/[^a-z]/g, '')}@healthassist.gov.pk`,
        hospitalId: dutyDoc.hospitalId,
        hospitalName: dutyDoc.hospitalName,
      };
      clinicianMap.set(dutyProfile.id, dutyProfile);
    }
  });

  return Array.from(clinicianMap.values());
};

// Find matching doctor profile by any query (name, license, id, partial name)
export const findMatchingDoctor = (doctorQuery: string): ClinicianProfile | undefined => {
  if (!doctorQuery || !doctorQuery.trim()) return undefined;

  const q = doctorQuery.toLowerCase().trim();
  const qNorm = normalizeDoctorName(doctorQuery);
  const allClinicians = getAllRegisteredClinicians();

  // 1. Exact ID or license match
  const exactIdOrLicense = allClinicians.find(
    (d) => d.id.toLowerCase() === q || d.licenseNo.toLowerCase() === q || d.licenseNo.toLowerCase().replace(/[^a-z0-9]/g, '') === q.replace(/[^a-z0-9]/g, '')
  );
  if (exactIdOrLicense) return exactIdOrLicense;

  // 2. Exact name match
  const exactName = allClinicians.find((d) => d.name.toLowerCase() === q);
  if (exactName) return exactName;

  // 3. Normalized name match
  if (qNorm.length >= 3) {
    const normMatch = allClinicians.find((d) => {
      const dNorm = normalizeDoctorName(d.name);
      return dNorm === qNorm || dNorm.includes(qNorm) || qNorm.includes(dNorm);
    });
    if (normMatch) return normMatch;
  }

  // 4. Substring match
  const subMatch = allClinicians.find((d) => d.name.toLowerCase().includes(q) || q.includes(d.name.toLowerCase()));
  if (subMatch) return subMatch;

  return undefined;
};

// Find matching hospital facility by any query (name, short name, code, id, district)
export const findMatchingHospital = (hospitalQuery: string): HospitalFacility | undefined => {
  if (!hospitalQuery || !hospitalQuery.trim()) return undefined;

  const q = hospitalQuery.toLowerCase().trim();
  const qNorm = normalizeHospitalName(hospitalQuery);

  // 1. Exact ID, code, or seal initials match
  const exactCodeOrId = PRESET_HOSPITALS.find(
    (h) =>
      h.id.toLowerCase() === q ||
      h.facilityCode.toLowerCase() === q ||
      h.sealInitials.toLowerCase() === q ||
      h.shortName.toLowerCase() === q ||
      h.name.toLowerCase() === q
  );
  if (exactCodeOrId) return exactCodeOrId;

  // 2. Normalized hospital name or shortName match
  if (qNorm.length >= 3) {
    const normMatch = PRESET_HOSPITALS.find((h) => {
      const hNormName = normalizeHospitalName(h.name);
      const hNormShort = normalizeHospitalName(h.shortName);
      return (
        hNormName.includes(qNorm) ||
        qNorm.includes(hNormName) ||
        hNormShort.includes(qNorm) ||
        qNorm.includes(hNormShort)
      );
    });
    if (normMatch) return normMatch;
  }

  // 3. Substring match
  const subMatch = PRESET_HOSPITALS.find(
    (h) =>
      h.name.toLowerCase().includes(q) ||
      h.shortName.toLowerCase().includes(q) ||
      q.includes(h.shortName.toLowerCase()) ||
      h.district.toLowerCase().includes(q)
  );
  if (subMatch) return subMatch;

  return undefined;
};

// Find linked hospital for a given doctor profile or name/id
export const findHospitalForDoctor = (doctor: ClinicianProfile | string): HospitalFacility | undefined => {
  if (!doctor) return undefined;

  let docProfile: ClinicianProfile | undefined;
  if (typeof doctor === 'string') {
    docProfile = findMatchingDoctor(doctor);
  } else {
    docProfile = doctor;
  }

  if (docProfile?.hospitalId) {
    const hosp = PRESET_HOSPITALS.find((h) => h.id === docProfile?.hospitalId);
    if (hosp) return hosp;
  }

  if (docProfile?.hospitalName) {
    const matched = findMatchingHospital(docProfile.hospitalName);
    if (matched) return matched;
  }

  // If passed string directly matches a hospital, return it
  if (typeof doctor === 'string') {
    const directHosp = findMatchingHospital(doctor);
    if (directHosp) return directHosp;
  }

  return undefined;
};

// Find linked lead clinician for a given hospital facility or name/id
export const findDoctorForHospital = (hospital: HospitalFacility | string): ClinicianProfile | undefined => {
  if (!hospital) return undefined;

  let hospId = '';
  let hospName = '';
  let hospShort = '';

  if (typeof hospital === 'string') {
    const matchedHosp = findMatchingHospital(hospital);
    if (matchedHosp) {
      hospId = matchedHosp.id;
      hospName = matchedHosp.name;
      hospShort = matchedHosp.shortName;
    } else {
      hospId = hospital;
      hospName = hospital;
      hospShort = hospital;
    }
  } else {
    hospId = hospital.id;
    hospName = hospital.name;
    hospShort = hospital.shortName;
  }

  // 1. Check PRESET_DOCTORS first
  const presetMatch = PRESET_DOCTORS.find(
    (d) =>
      (d.hospitalId && d.hospitalId === hospId) ||
      (d.hospitalName && hospShort && d.hospitalName.toLowerCase().includes(hospShort.toLowerCase())) ||
      (d.hospitalName && hospName && hospName.toLowerCase().includes(d.hospitalName.toLowerCase())) ||
      (hospShort && d.hospitalName && hospShort.toLowerCase().includes(d.hospitalName.toLowerCase()))
  );
  if (presetMatch) return presetMatch;

  // 2. Check all registered clinicians (including duty roster)
  const allClinicians = getAllRegisteredClinicians();
  const dutyMatch = allClinicians.find(
    (d) =>
      (d.hospitalId && d.hospitalId === hospId) ||
      (d.hospitalName && hospShort && d.hospitalName.toLowerCase().includes(hospShort.toLowerCase())) ||
      (d.hospitalName && hospName && hospName.toLowerCase().includes(d.hospitalName.toLowerCase())) ||
      (hospShort && d.hospitalName && hospShort.toLowerCase().includes(d.hospitalName.toLowerCase()))
  );
  if (dutyMatch) return dutyMatch;

  return undefined;
};

type ProfileChangeListener = (doctor: ClinicianProfile, hospital: HospitalFacility) => void;

class ClinicalProfileSyncService {
  private activeDoctor: ClinicianProfile;
  private activeHospital: HospitalFacility;
  private listeners: Set<ProfileChangeListener> = new Set();
  private doctorThemeMap: Record<string, 'light' | 'dark'> = {};

  constructor() {
    // Load per-clinician theme map
    try {
      const savedThemeMap = localStorage.getItem('clinician_theme_map');
      if (savedThemeMap) {
        this.doctorThemeMap = JSON.parse(savedThemeMap);
      }
    } catch {
      this.doctorThemeMap = {};
    }

    // Load persisted doctor
    const savedDoc = localStorage.getItem('active_clinician_profile');
    if (savedDoc) {
      try {
        this.activeDoctor = JSON.parse(savedDoc);
      } catch {
        this.activeDoctor = PRESET_DOCTORS[0];
      }
    } else {
      this.activeDoctor = PRESET_DOCTORS[0];
    }

    // Assign themePreference if in theme map
    if (this.activeDoctor && this.activeDoctor.id) {
      if (this.doctorThemeMap[this.activeDoctor.id]) {
        this.activeDoctor.themePreference = this.doctorThemeMap[this.activeDoctor.id];
      }
    }

    // Load persisted hospital
    const savedHosp = localStorage.getItem('active_hospital_facility');
    if (savedHosp) {
      try {
        this.activeHospital = JSON.parse(savedHosp);
      } catch {
        this.activeHospital = PRESET_HOSPITALS[0];
      }
    } else {
      // If doctor has linked hospital, match initial hospital to active doctor
      const initialLinkedHosp = findHospitalForDoctor(this.activeDoctor);
      this.activeHospital = initialLinkedHosp || PRESET_HOSPITALS[0];
    }
  }

  public getActiveDoctor(): ClinicianProfile {
    return { ...this.activeDoctor };
  }

  public getActiveHospital(): HospitalFacility {
    return { ...this.activeHospital };
  }

  public getClinicianTheme(doctorId?: string): 'light' | 'dark' {
    const targetId = doctorId || this.activeDoctor.id;
    if (targetId && this.doctorThemeMap[targetId]) {
      return this.doctorThemeMap[targetId];
    }
    if (this.activeDoctor && this.activeDoctor.themePreference) {
      return this.activeDoctor.themePreference;
    }
    const globalTheme = localStorage.getItem('app_theme');
    return globalTheme === 'dark' ? 'dark' : 'light';
  }

  public setClinicianTheme(theme: 'light' | 'dark', doctorId?: string): void {
    const targetId = doctorId || this.activeDoctor.id;
    if (targetId) {
      this.doctorThemeMap[targetId] = theme;
      localStorage.setItem('clinician_theme_map', JSON.stringify(this.doctorThemeMap));
    }
    this.activeDoctor = {
      ...this.activeDoctor,
      themePreference: theme,
    };
    localStorage.setItem('active_clinician_profile', JSON.stringify(this.activeDoctor));
    localStorage.setItem('app_theme', theme);
    this.notifyListeners();
  }

  public setActiveDoctor(doc: ClinicianProfile | string): void {
    if (typeof doc === 'string') {
      const match = findMatchingDoctor(doc);
      if (match) {
        this.activeDoctor = { ...match };
        // Auto match & synchronize hospital
        const linkedHosp = findHospitalForDoctor(match);
        if (linkedHosp) {
          this.activeHospital = { ...linkedHosp };
          localStorage.setItem('active_hospital_facility', JSON.stringify(this.activeHospital));
        }
      } else {
        // Custom name
        this.activeDoctor = {
          ...this.activeDoctor,
          id: `custom-${Date.now()}`,
          name: doc,
          signatureText: doc,
        };
      }
    } else {
      this.activeDoctor = { ...doc };
      // Auto match & synchronize hospital
      const linkedHosp = findHospitalForDoctor(doc);
      if (linkedHosp) {
        this.activeHospital = { ...linkedHosp };
        localStorage.setItem('active_hospital_facility', JSON.stringify(this.activeHospital));
      }
    }

    // Restore saved theme for this doctor if exists
    if (this.activeDoctor.id && this.doctorThemeMap[this.activeDoctor.id]) {
      this.activeDoctor.themePreference = this.doctorThemeMap[this.activeDoctor.id];
      localStorage.setItem('app_theme', this.doctorThemeMap[this.activeDoctor.id]);
    } else if (this.activeDoctor.themePreference) {
      this.doctorThemeMap[this.activeDoctor.id] = this.activeDoctor.themePreference;
      localStorage.setItem('clinician_theme_map', JSON.stringify(this.doctorThemeMap));
      localStorage.setItem('app_theme', this.activeDoctor.themePreference);
    }

    localStorage.setItem('active_clinician_profile', JSON.stringify(this.activeDoctor));
    this.notifyListeners();
  }

  public setActiveHospital(hosp: HospitalFacility | string): void {
    let targetHospital: HospitalFacility | undefined;

    if (typeof hosp === 'string') {
      const match = findMatchingHospital(hosp);
      if (match) {
        targetHospital = { ...match };
      } else {
        // Custom hospital name
        targetHospital = {
          ...this.activeHospital,
          id: `custom-${Date.now()}`,
          name: hosp,
          shortName: hosp.split('-')[0].trim(),
          sealInitials: hosp.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'HOSP',
        };
      }
    } else {
      targetHospital = { ...hosp };
    }

    this.activeHospital = targetHospital;
    localStorage.setItem('active_hospital_facility', JSON.stringify(this.activeHospital));

    // Auto synchronize doctor to the assigned physician of this hospital
    const linkedDoctor = findDoctorForHospital(targetHospital);
    if (linkedDoctor) {
      this.activeDoctor = { ...linkedDoctor };

      // Restore saved theme for this doctor if exists
      if (this.activeDoctor.id && this.doctorThemeMap[this.activeDoctor.id]) {
        this.activeDoctor.themePreference = this.doctorThemeMap[this.activeDoctor.id];
        localStorage.setItem('app_theme', this.doctorThemeMap[this.activeDoctor.id]);
      }

      localStorage.setItem('active_clinician_profile', JSON.stringify(this.activeDoctor));
    }

    this.notifyListeners();
  }

  public updateCustomDoctorDetails(updates: Partial<ClinicianProfile>): void {
    // Check if the updated name matches a known doctor in presets
    let matchedDoc: ClinicianProfile | undefined;
    if (updates.name) {
      matchedDoc = findMatchingDoctor(updates.name);
    }

    if (matchedDoc) {
      this.activeDoctor = {
        ...matchedDoc,
        ...updates,
      };
      const linkedHosp = findHospitalForDoctor(matchedDoc);
      if (linkedHosp) {
        this.activeHospital = { ...linkedHosp };
        localStorage.setItem('active_hospital_facility', JSON.stringify(this.activeHospital));
      }
    } else {
      this.activeDoctor = {
        ...this.activeDoctor,
        ...updates,
        signatureText: updates.name ? updates.name : this.activeDoctor.signatureText,
      };

      if (updates.hospitalId || updates.hospitalName) {
        const linkedHosp = findHospitalForDoctor(this.activeDoctor);
        if (linkedHosp) {
          this.activeHospital = { ...linkedHosp };
          localStorage.setItem('active_hospital_facility', JSON.stringify(this.activeHospital));
        }
      }
    }

    localStorage.setItem('active_clinician_profile', JSON.stringify(this.activeDoctor));
    this.notifyListeners();
  }

  public updateCustomHospitalDetails(updates: Partial<HospitalFacility>): void {
    // Check if the updated hospital matches a preset hospital
    let matchedHosp: HospitalFacility | undefined;
    if (updates.name || updates.shortName) {
      matchedHosp = findMatchingHospital(updates.name || updates.shortName || '');
    }

    if (matchedHosp) {
      this.activeHospital = {
        ...matchedHosp,
        ...updates,
      };
      const linkedDoctor = findDoctorForHospital(matchedHosp);
      if (linkedDoctor) {
        this.activeDoctor = { ...linkedDoctor };
        localStorage.setItem('active_clinician_profile', JSON.stringify(this.activeDoctor));
      }
    } else {
      this.activeHospital = {
        ...this.activeHospital,
        ...updates,
      };

      if (updates.id) {
        const linkedDoctor = findDoctorForHospital(this.activeHospital);
        if (linkedDoctor) {
          this.activeDoctor = { ...linkedDoctor };
          localStorage.setItem('active_clinician_profile', JSON.stringify(this.activeDoctor));
        }
      }
    }

    localStorage.setItem('active_hospital_facility', JSON.stringify(this.activeHospital));
    this.notifyListeners();
  }

  public subscribe(listener: ProfileChangeListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.activeDoctor, this.activeHospital);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeDoctor, this.activeHospital);
      } catch (err) {
        console.error('Error in profile change listener:', err);
      }
    });
  }
}

export const clinicalProfileSync = new ClinicalProfileSyncService();
