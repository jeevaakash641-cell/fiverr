/**
 * Career Data Engine
 * Contains career information, daily routines, skills, salary timelines, and roadmaps
 */

export const CAREERS = {
  doctor: {
    id: 'doctor',
    name: 'Doctor (MBBS)',
    icon: '🩺',
    category: 'Medical',
    description: 'Medical professional treating patients and saving lives',
    requiredStudyHours: 5000, // Total hours needed to achieve this career goal
    
    dailyRoutine: [
      { time: '06:00', activity: 'Wake up and morning preparation' },
      { time: '08:00', activity: 'Hospital rounds - Check patients' },
      { time: '10:00', activity: 'OPD consultations' },
      { time: '12:00', activity: 'Lunch break' },
      { time: '13:00', activity: 'Patient consultations continue' },
      { time: '16:00', activity: 'Paperwork and medical records' },
      { time: '18:00', activity: 'Evening rounds' },
      { time: '20:00', activity: 'Emergency duty (on-call)' },
      { time: '22:00', activity: 'Study medical journals' }
    ],
    
    requiredSkills: [
      { skill: 'Biology expertise', level: 'Expert', importance: 'Critical' },
      { skill: 'Chemistry knowledge', level: 'Advanced', importance: 'Critical' },
      { skill: 'Long study duration', level: 'High', importance: 'Critical' },
      { skill: 'Emotional resilience', level: 'High', importance: 'Critical' },
      { skill: 'Communication skills', level: 'Advanced', importance: 'High' },
      { skill: 'Decision making', level: 'Expert', importance: 'Critical' },
      { skill: 'Physical stamina', level: 'High', importance: 'High' }
    ],
    
    stressLevel: {
      level: 'High',
      score: 8,
      reasons: [
        'Long working hours (12-16 hours)',
        'Emergency responsibilities',
        'Life-or-death decisions',
        'Emotional burden of patient care',
        'Continuous learning required'
      ]
    },
    
    salaryTimeline: [
      { year: 1, stage: 'Internship', salary: '₹50,000 - ₹80,000/month', annual: '₹6-10 LPA' },
      { year: 3, stage: 'Junior Doctor', salary: '₹80,000 - ₹1,50,000/month', annual: '₹10-18 LPA' },
      { year: 5, stage: 'Specialist (MD/MS)', salary: '₹1,50,000 - ₹3,00,000/month', annual: '₹18-36 LPA' },
      { year: 10, stage: 'Senior Specialist', salary: '₹3,00,000 - ₹5,00,000/month', annual: '₹36-60 LPA' },
      { year: 15, stage: 'Consultant/Private Practice', salary: '₹5,00,000+/month', annual: '₹60 LPA+' }
    ],
    
    roadmap: [
      { step: 1, title: 'Complete 10+2 (PCB)', duration: '2 years', description: 'Focus on Physics, Chemistry, Biology with 60%+ marks' },
      { step: 2, title: 'Clear NEET Exam', duration: '1-2 years', description: 'Prepare for and clear NEET-UG with good rank' },
      { step: 3, title: 'MBBS Degree', duration: '5.5 years', description: '4.5 years study + 1 year internship' },
      { step: 4, title: 'Medical Registration', duration: '1 month', description: 'Register with State Medical Council' },
      { step: 5, title: 'MD/MS Specialization (Optional)', duration: '3 years', description: 'Specialize in a medical field' },
      { step: 6, title: 'Practice/Hospital Job', duration: 'Career', description: 'Start practice or join hospital' }
    ],
    
    futurePreview: 'Your life as a Doctor will involve saving lives, treating patients, and continuous learning. You will work long hours, handle emergencies, and make critical decisions. The profession is highly respected but demanding. You will experience both the joy of healing and the stress of responsibility.',
    
    pros: [
      'High respect in society',
      'Job security',
      'Opportunity to save lives',
      'Good earning potential',
      'Continuous learning'
    ],
    
    cons: [
      'Very long study duration (5.5+ years)',
      'High stress and responsibility',
      'Long working hours',
      'Emotional burden',
      'Expensive education'
    ]
  },

  iasOfficer: {
    id: 'iasOfficer',
    name: 'IAS Officer',
    icon: '🏛️',
    category: 'Civil Services',
    description: 'Administrative officer managing district/state governance',
    requiredStudyHours: 3500, // Total hours needed to achieve this career goal
    
    dailyRoutine: [
      { time: '07:00', activity: 'Wake up and newspaper reading' },
      { time: '09:00', activity: 'Office - Review files and reports' },
      { time: '11:00', activity: 'Meetings with department heads' },
      { time: '13:00', activity: 'Lunch break' },
      { time: '14:00', activity: 'Field visits and inspections' },
      { time: '17:00', activity: 'Public grievance handling' },
      { time: '19:00', activity: 'Policy planning and documentation' },
      { time: '21:00', activity: 'Study current affairs' }
    ],
    
    requiredSkills: [
      { skill: 'General knowledge', level: 'Expert', importance: 'Critical' },
      { skill: 'Current affairs awareness', level: 'Expert', importance: 'Critical' },
      { skill: 'Leadership abilities', level: 'Advanced', importance: 'Critical' },
      { skill: 'Decision making', level: 'Expert', importance: 'Critical' },
      { skill: 'Communication skills', level: 'Expert', importance: 'Critical' },
      { skill: 'Problem solving', level: 'Advanced', importance: 'High' },
      { skill: 'Patience and persistence', level: 'High', importance: 'Critical' }
    ],
    
    stressLevel: {
      level: 'Very High',
      score: 9,
      reasons: [
        'High responsibility for public welfare',
        'Political pressure',
        'Frequent transfers',
        'Work-life balance challenges',
        'Public scrutiny'
      ]
    },
    
    salaryTimeline: [
      { year: 1, stage: 'Training (LBSNAA)', salary: '₹56,100/month', annual: '₹6.7 LPA' },
      { year: 3, stage: 'SDM/Sub-Collector', salary: '₹78,800/month', annual: '₹9.5 LPA' },
      { year: 5, stage: 'District Magistrate', salary: '₹1,18,500/month', annual: '₹14.2 LPA' },
      { year: 10, stage: 'Commissioner', salary: '₹1,44,200/month', annual: '₹17.3 LPA' },
      { year: 15, stage: 'Secretary Level', salary: '₹2,25,000/month', annual: '₹27 LPA' }
    ],
    
    roadmap: [
      { step: 1, title: 'Complete Bachelor\'s Degree', duration: '3-4 years', description: 'Any stream, minimum 50% marks' },
      { step: 2, title: 'Prepare for UPSC', duration: '1-2 years', description: 'Intensive preparation for Civil Services Exam' },
      { step: 3, title: 'Clear Prelims', duration: '1 attempt', description: 'Objective test - General Studies & CSAT' },
      { step: 4, title: 'Clear Mains', duration: '1 attempt', description: 'Descriptive exam - 9 papers' },
      { step: 5, title: 'Clear Interview', duration: '1 attempt', description: 'Personality test by UPSC board' },
      { step: 6, title: 'Training at LBSNAA', duration: '2 years', description: 'Foundation course and district training' }
    ],
    
    futurePreview: 'Your life as an IAS Officer will involve managing district administration, implementing government policies, and serving the public. You will have significant power and responsibility, handle complex problems, and work under political pressure. The role offers prestige and the opportunity to make a real difference in society.',
    
    pros: [
      'Highest respect and prestige',
      'Power to make real change',
      'Job security',
      'Good perks and benefits',
      'Diverse work experience'
    ],
    
    cons: [
      'Extremely competitive exam (0.1% success rate)',
      'Long preparation time',
      'High stress and responsibility',
      'Political interference',
      'Frequent transfers'
    ]
  },

  gameDeveloper: {
    id: 'gameDeveloper',
    name: 'Game Developer',
    icon: '🎮',
    category: 'Technology',
    description: 'Create video games and interactive entertainment',
    requiredStudyHours: 2000, // Total hours needed to achieve this career goal
    
    dailyRoutine: [
      { time: '09:00', activity: 'Wake up and breakfast' },
      { time: '10:00', activity: 'Team standup meeting' },
      { time: '10:30', activity: 'Code game mechanics' },
      { time: '13:00', activity: 'Lunch break' },
      { time: '14:00', activity: 'Bug fixing and testing' },
      { time: '16:00', activity: 'Design review meeting' },
      { time: '17:00', activity: 'Implement new features' },
      { time: '19:00', activity: 'Playtesting and feedback' },
      { time: '20:00', activity: 'Personal game projects' }
    ],
    
    requiredSkills: [
      { skill: 'Programming (C++/C#/Unity)', level: 'Advanced', importance: 'Critical' },
      { skill: 'Game design principles', level: 'Advanced', importance: 'Critical' },
      { skill: 'Mathematics & Physics', level: 'Intermediate', importance: 'High' },
      { skill: 'Creativity', level: 'High', importance: 'Critical' },
      { skill: '3D modeling basics', level: 'Intermediate', importance: 'Medium' },
      { skill: 'Problem solving', level: 'Advanced', importance: 'High' },
      { skill: 'Teamwork', level: 'Advanced', importance: 'High' }
    ],
    
    stressLevel: {
      level: 'Medium-High',
      score: 6,
      reasons: [
        'Tight deadlines (crunch time)',
        'Creative pressure',
        'Technical challenges',
        'Market competition',
        'Long sitting hours'
      ]
    },
    
    salaryTimeline: [
      { year: 1, stage: 'Junior Developer', salary: '₹25,000 - ₹40,000/month', annual: '₹3-5 LPA' },
      { year: 3, stage: 'Game Developer', salary: '₹50,000 - ₹80,000/month', annual: '₹6-10 LPA' },
      { year: 5, stage: 'Senior Developer', salary: '₹1,00,000 - ₹1,50,000/month', annual: '₹12-18 LPA' },
      { year: 10, stage: 'Lead Developer', salary: '₹1,50,000 - ₹2,50,000/month', annual: '₹18-30 LPA' },
      { year: 15, stage: 'Game Director/Studio Owner', salary: '₹2,50,000+/month', annual: '₹30 LPA+' }
    ],
    
    roadmap: [
      { step: 1, title: 'Learn Programming', duration: '6-12 months', description: 'Master C++, C#, or Python' },
      { step: 2, title: 'Learn Game Engine', duration: '6-12 months', description: 'Unity or Unreal Engine' },
      { step: 3, title: 'Build Portfolio Games', duration: '1-2 years', description: 'Create 3-5 complete games' },
      { step: 4, title: 'Bachelor\'s Degree (Optional)', duration: '3-4 years', description: 'Computer Science or Game Design' },
      { step: 5, title: 'Join Game Studio', duration: 'Career', description: 'Start as junior developer' },
      { step: 6, title: 'Specialize', duration: 'Ongoing', description: 'Gameplay, Graphics, AI, or Network' }
    ],
    
    futurePreview: 'Your life as a Game Developer will involve creating interactive entertainment, solving technical challenges, and bringing creative ideas to life. You will work in teams, face tight deadlines, and experience the thrill of seeing players enjoy your creations. The field is competitive but rewarding for passionate individuals.',
    
    pros: [
      'Creative and fun work',
      'Growing industry in India',
      'Remote work opportunities',
      'Passion-driven career',
      'Good earning potential'
    ],
    
    cons: [
      'Crunch time stress',
      'Competitive field',
      'Job instability in small studios',
      'Long sitting hours',
      'Requires continuous learning'
    ]
  },

  entrepreneur: {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    icon: '💼',
    category: 'Business',
    description: 'Start and run your own business venture',
    requiredStudyHours: 1500, // Total hours needed to achieve this career goal
    
    dailyRoutine: [
      { time: '06:00', activity: 'Wake up and planning' },
      { time: '08:00', activity: 'Team meetings and strategy' },
      { time: '10:00', activity: 'Client meetings' },
      { time: '12:00', activity: 'Business development' },
      { time: '14:00', activity: 'Lunch and networking' },
      { time: '15:00', activity: 'Operations management' },
      { time: '17:00', activity: 'Financial planning' },
      { time: '19:00', activity: 'Marketing and sales' },
      { time: '21:00', activity: 'Learning and research' }
    ],
    
    requiredSkills: [
      { skill: 'Business acumen', level: 'Advanced', importance: 'Critical' },
      { skill: 'Risk taking ability', level: 'High', importance: 'Critical' },
      { skill: 'Leadership', level: 'Expert', importance: 'Critical' },
      { skill: 'Financial management', level: 'Advanced', importance: 'Critical' },
      { skill: 'Marketing skills', level: 'Advanced', importance: 'High' },
      { skill: 'Networking', level: 'Advanced', importance: 'High' },
      { skill: 'Resilience', level: 'Expert', importance: 'Critical' }
    ],
    
    stressLevel: {
      level: 'Very High',
      score: 9,
      reasons: [
        'Financial uncertainty',
        'High failure risk',
        'Work-life imbalance',
        'Multiple responsibilities',
        'Constant pressure to succeed'
      ]
    },
    
    salaryTimeline: [
      { year: 1, stage: 'Startup Phase', salary: 'Variable (₹0 - ₹50,000/month)', annual: '₹0-6 LPA' },
      { year: 3, stage: 'Growth Phase', salary: '₹50,000 - ₹1,50,000/month', annual: '₹6-18 LPA' },
      { year: 5, stage: 'Established Business', salary: '₹1,50,000 - ₹5,00,000/month', annual: '₹18-60 LPA' },
      { year: 10, stage: 'Successful Venture', salary: '₹5,00,000+/month', annual: '₹60 LPA+' },
      { year: 15, stage: 'Multiple Ventures/Exit', salary: 'Highly Variable', annual: '₹1 Cr+' }
    ],
    
    roadmap: [
      { step: 1, title: 'Identify Business Idea', duration: '3-6 months', description: 'Find problem to solve or market gap' },
      { step: 2, title: 'Market Research', duration: '2-3 months', description: 'Validate idea and study competition' },
      { step: 3, title: 'Create Business Plan', duration: '1-2 months', description: 'Plan finances, operations, marketing' },
      { step: 4, title: 'Arrange Funding', duration: '3-6 months', description: 'Self-funding, loans, or investors' },
      { step: 5, title: 'Launch MVP', duration: '6-12 months', description: 'Minimum Viable Product' },
      { step: 6, title: 'Scale and Grow', duration: 'Ongoing', description: 'Expand operations and market reach' }
    ],
    
    futurePreview: 'Your life as an Entrepreneur will involve building something from scratch, taking risks, and facing uncertainty. You will wear multiple hats, work long hours, and experience both failures and successes. The journey is challenging but offers unlimited potential and the satisfaction of creating your own path.',
    
    pros: [
      'Unlimited earning potential',
      'Be your own boss',
      'Create impact',
      'Flexible schedule',
      'Build wealth and legacy'
    ],
    
    cons: [
      'High financial risk',
      'No guaranteed income',
      'Extreme stress',
      'Long working hours',
      'High failure rate (90%)'
    ]
  },

  dataScientist: {
    id: 'dataScientist',
    name: 'Data Scientist',
    icon: '📊',
    category: 'Technology',
    description: 'Analyze data to derive insights and build ML models',
    requiredStudyHours: 2500, // Total hours needed to achieve this career goal
    
    dailyRoutine: [
      { time: '09:00', activity: 'Wake up and breakfast' },
      { time: '10:00', activity: 'Team standup meeting' },
      { time: '10:30', activity: 'Data analysis and exploration' },
      { time: '13:00', activity: 'Lunch break' },
      { time: '14:00', activity: 'Build ML models' },
      { time: '16:00', activity: 'Model testing and validation' },
      { time: '17:00', activity: 'Stakeholder presentations' },
      { time: '18:30', activity: 'Documentation' },
      { time: '19:30', activity: 'Learning new techniques' }
    ],
    
    requiredSkills: [
      { skill: 'Python/R programming', level: 'Advanced', importance: 'Critical' },
      { skill: 'Statistics & Mathematics', level: 'Advanced', importance: 'Critical' },
      { skill: 'Machine Learning', level: 'Advanced', importance: 'Critical' },
      { skill: 'Data visualization', level: 'Intermediate', importance: 'High' },
      { skill: 'SQL and databases', level: 'Intermediate', importance: 'High' },
      { skill: 'Business understanding', level: 'Intermediate', importance: 'High' },
      { skill: 'Communication skills', level: 'Advanced', importance: 'High' }
    ],
    
    stressLevel: {
      level: 'Medium',
      score: 5,
      reasons: [
        'Tight project deadlines',
        'Complex problem solving',
        'Stakeholder expectations',
        'Continuous learning required',
        'Data quality issues'
      ]
    },
    
    salaryTimeline: [
      { year: 1, stage: 'Junior Data Analyst', salary: '₹40,000 - ₹60,000/month', annual: '₹5-7 LPA' },
      { year: 3, stage: 'Data Scientist', salary: '₹80,000 - ₹1,20,000/month', annual: '₹10-15 LPA' },
      { year: 5, stage: 'Senior Data Scientist', salary: '₹1,50,000 - ₹2,50,000/month', annual: '₹18-30 LPA' },
      { year: 10, stage: 'Lead Data Scientist', salary: '₹2,50,000 - ₹4,00,000/month', annual: '₹30-48 LPA' },
      { year: 15, stage: 'Chief Data Officer', salary: '₹4,00,000+/month', annual: '₹48 LPA+' }
    ],
    
    roadmap: [
      { step: 1, title: 'Learn Programming', duration: '3-6 months', description: 'Master Python and R' },
      { step: 2, title: 'Study Statistics & Math', duration: '6-12 months', description: 'Probability, linear algebra, calculus' },
      { step: 3, title: 'Learn Machine Learning', duration: '6-12 months', description: 'Algorithms, frameworks, tools' },
      { step: 4, title: 'Build Portfolio Projects', duration: '6-12 months', description: 'Real-world data science projects' },
      { step: 5, title: 'Bachelor\'s/Master\'s Degree', duration: '3-5 years', description: 'CS, Statistics, or related field' },
      { step: 6, title: 'Join Company', duration: 'Career', description: 'Start as analyst, grow to scientist' }
    ],
    
    futurePreview: 'Your life as a Data Scientist will involve working with large datasets, building predictive models, and deriving insights that drive business decisions. You will combine technical skills with business understanding, work in cross-functional teams, and continuously learn new techniques. The field is in high demand and offers excellent career growth.',
    
    pros: [
      'High demand and job security',
      'Excellent salary',
      'Intellectually stimulating',
      'Remote work opportunities',
      'Growing field'
    ],
    
    cons: [
      'Requires strong math skills',
      'Continuous learning needed',
      'Can be repetitive',
      'Data quality challenges',
      'Stakeholder management'
    ]
  },

  softwareEngineer: {
    id: 'softwareEngineer',
    name: 'Software Engineer',
    icon: '💻',
    category: 'Technology',
    description: 'Design, develop, and maintain software applications',
    requiredStudyHours: 2200, // Total hours needed to achieve this career goal
    
    dailyRoutine: [
      { time: '09:00', activity: 'Wake up and breakfast' },
      { time: '10:00', activity: 'Daily standup meeting' },
      { time: '10:15', activity: 'Code review' },
      { time: '11:00', activity: 'Feature development' },
      { time: '13:00', activity: 'Lunch break' },
      { time: '14:00', activity: 'Coding and debugging' },
      { time: '16:00', activity: 'Testing and deployment' },
      { time: '17:00', activity: 'Documentation' },
      { time: '18:00', activity: 'Team collaboration' },
      { time: '19:00', activity: 'Personal learning' }
    ],
    
    requiredSkills: [
      { skill: 'Programming languages', level: 'Advanced', importance: 'Critical' },
      { skill: 'Data structures & algorithms', level: 'Advanced', importance: 'Critical' },
      { skill: 'Problem solving', level: 'Advanced', importance: 'Critical' },
      { skill: 'System design', level: 'Intermediate', importance: 'High' },
      { skill: 'Version control (Git)', level: 'Intermediate', importance: 'High' },
      { skill: 'Communication', level: 'Intermediate', importance: 'High' },
      { skill: 'Teamwork', level: 'Advanced', importance: 'High' }
    ],
    
    stressLevel: {
      level: 'Medium',
      score: 5,
      reasons: [
        'Tight deadlines',
        'Bug fixing pressure',
        'On-call duties',
        'Continuous learning',
        'Meeting expectations'
      ]
    },
    
    salaryTimeline: [
      { year: 1, stage: 'Junior Developer', salary: '₹30,000 - ₹50,000/month', annual: '₹4-6 LPA' },
      { year: 3, stage: 'Software Engineer', salary: '₹60,000 - ₹1,00,000/month', annual: '₹7-12 LPA' },
      { year: 5, stage: 'Senior Engineer', salary: '₹1,20,000 - ₹2,00,000/month', annual: '₹15-25 LPA' },
      { year: 10, stage: 'Tech Lead/Architect', salary: '₹2,50,000 - ₹4,00,000/month', annual: '₹30-50 LPA' },
      { year: 15, stage: 'Engineering Manager/CTO', salary: '₹4,00,000+/month', annual: '₹50 LPA+' }
    ],
    
    roadmap: [
      { step: 1, title: 'Learn Programming', duration: '6-12 months', description: 'Master one language (Java/Python/JavaScript)' },
      { step: 2, title: 'Study DSA', duration: '6-12 months', description: 'Data structures and algorithms' },
      { step: 3, title: 'Build Projects', duration: '6-12 months', description: 'Create portfolio of applications' },
      { step: 4, title: 'Bachelor\'s Degree', duration: '4 years', description: 'Computer Science or related field' },
      { step: 5, title: 'Internships', duration: '6-12 months', description: 'Gain industry experience' },
      { step: 6, title: 'Join Tech Company', duration: 'Career', description: 'Start as junior, grow to senior' }
    ],
    
    futurePreview: 'Your life as a Software Engineer will involve building applications, solving technical problems, and working in collaborative teams. You will write code, review others\' code, and continuously learn new technologies. The field offers excellent career growth, good work-life balance, and the satisfaction of creating products used by millions.',
    
    pros: [
      'High demand globally',
      'Excellent salary',
      'Remote work opportunities',
      'Creative problem solving',
      'Good work-life balance'
    ],
    
    cons: [
      'Continuous learning required',
      'Can be sedentary',
      'Deadline pressure',
      'Competitive field',
      'Burnout risk'
    ]
  }
};

export const CAREER_CATEGORIES = {
  medical: ['doctor'],
  civilServices: ['iasOfficer'],
  technology: ['gameDeveloper', 'dataScientist', 'softwareEngineer'],
  business: ['entrepreneur']
};

export function getCareerById(careerId) {
  return CAREERS[careerId] || null;
}

export function getAllCareers() {
  return Object.values(CAREERS);
}

export function getCareersByCategory(category) {
  const careerIds = CAREER_CATEGORIES[category] || [];
  return careerIds.map(id => CAREERS[id]).filter(Boolean);
}

export function calculateSkillGap(studentSkills, careerSkills) {
  // Simple skill gap calculation
  // Returns: 'Low', 'Medium', or 'High'
  
  if (!studentSkills || studentSkills.length === 0) {
    return 'High';
  }
  
  const matchCount = careerSkills.filter(cs => 
    studentSkills.some(ss => 
      ss.toLowerCase().includes(cs.skill.toLowerCase()) ||
      cs.skill.toLowerCase().includes(ss.toLowerCase())
    )
  ).length;
  
  const matchPercentage = (matchCount / careerSkills.length) * 100;
  
  if (matchPercentage >= 70) return 'Low';
  if (matchPercentage >= 40) return 'Medium';
  return 'High';
}
