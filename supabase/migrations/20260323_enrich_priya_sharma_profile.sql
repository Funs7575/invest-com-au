-- Migration: Enrich Priya Sharma mortgage broker profile with full seed data
-- Upserts the priya-sharma mortgage broker profile with rich, realistic data
-- and seeds 8 approved reviews so the profile looks fleshed out.

-- 1. Upsert the profile
INSERT INTO professionals (
  slug, name, firm_name, type,
  specialties, location_state, location_suburb, location_display,
  registration_number, abn,
  bio, photo_url, website, phone, email,
  fee_structure, fee_description, initial_consultation_free,
  rating, review_count, verified, status, onboarded_at, profile_complete,
  years_experience, avg_response_minutes,
  meeting_types,
  qualifications,
  memberships,
  languages,
  service_areas,
  education,
  faqs,
  testimonials,
  linkedin_url,
  booking_link,
  booking_intro,
  accepting_new_clients,
  ideal_client
)
VALUES (
  'priya-sharma',
  'Priya Sharma',
  'Sharma Financial Advisory',
  'mortgage_broker',

  -- Specialties
  '["First home buyers", "Investment property loans", "Refinancing", "Self-employed borrowers", "Multilingual (Hindi/Punjabi)"]'::jsonb,
  'VIC', 'Doncaster', 'Doncaster, Melbourne VIC',

  -- Credentials
  'MFAA 48291',
  '72 841 037 296',

  -- Bio
  'Priya brings over 11 years of banking and lending experience to every client conversation. Born in India and raised in Melbourne, she specialises in helping first-generation Australian families — and first-time investors — navigate the home loan market with confidence. Fluent in English, Hindi, and Punjabi, Priya makes the mortgage process accessible and stress-free for multicultural families who often feel overlooked by the major banks. She has access to a panel of 45+ lenders and takes the time to genuinely understand your financial situation before recommending a solution.',

  -- Photo (UI Avatars placeholder)
  'https://ui-avatars.com/api/?name=Priya+Sharma&size=400&background=f59e0b&color=fff&bold=true&font-size=0.4',

  -- Contact
  'https://sharmafinancial.com.au',
  '0412 887 334',
  'priya@sharmafinancial.com.au',

  -- Fees
  'commission',
  'No cost to you — Priya is paid by the lender. All commissions are disclosed upfront in full.',
  true,

  -- Ratings (seed value — will reflect reviews below)
  4.9, 42,
  true, 'active', NOW() - INTERVAL '14 months', true,

  -- Experience & response
  11,
  55, -- avg 55 mins response

  -- Meeting types
  ARRAY['in-person', 'video', 'phone'],

  -- Qualifications
  ARRAY[
    '11+ years of professional experience',
    'Diploma of Finance and Mortgage Broking (FNS50322)',
    'Certificate IV in Finance and Mortgage Broking (FNS40821)',
    'MFAA Accredited Broker',
    'Completed AFCA dispute resolution training'
  ],

  -- Memberships
  ARRAY['MFAA', 'AFCA'],

  -- Languages
  ARRAY['English', 'Hindi', 'Punjabi'],

  -- Service areas
  ARRAY['Doncaster', 'Templestowe', 'Manningham', 'Box Hill', 'Ringwood', 'Doncaster East', 'Melbourne CBD', 'Greater Melbourne'],

  -- Education
  '[
    {"institution": "RMIT University", "degree": "Bachelor of Business (Finance)", "year": 2012},
    {"institution": "AAMC Training Group", "degree": "Diploma of Finance and Mortgage Broking", "year": 2014}
  ]'::jsonb,

  -- FAQs
  '[
    {
      "q": "What does it cost to use a mortgage broker?",
      "a": "Nothing. As an MFAA-accredited broker, I am paid a commission by the lender when your loan settles. There are no upfront fees. All commissions are disclosed transparently in the Credit Guide I provide before we proceed."
    },
    {
      "q": "How many lenders do you have access to?",
      "a": "I work with a panel of over 45 lenders including the major banks (CBA, Westpac, ANZ, NAB), mid-tier banks, credit unions, and specialist non-bank lenders. This means I can find options that suit your specific situation — not just push you towards one product."
    },
    {
      "q": "Can you help if I''m self-employed?",
      "a": "Absolutely. Self-employed borrowers are one of my specialties. I work with lenders who offer low-doc and alt-doc loans, and I know which lenders are most flexible with ABN holders, sole traders, and company directors. Having the right documentation strategy makes a huge difference."
    },
    {
      "q": "How long does the mortgage application process take?",
      "a": "From our first meeting to receiving formal approval typically takes 3–6 weeks, depending on the lender and your individual circumstances. I manage the process end-to-end and keep you updated at every stage — no chasing required."
    },
    {
      "q": "Do you help with refinancing or just new purchases?",
      "a": "Both. Many of my clients come to me to refinance an existing loan and are surprised at how much they can save. I offer a free annual loan health check to all clients to make sure your rate and loan structure stay competitive over time."
    }
  ]'::jsonb,

  -- Testimonials
  '[
    {
      "quote": "Priya helped us buy our first home when two other brokers said it was impossible. She found a lender that assessed our income differently and we settled within 6 weeks. We cannot recommend her highly enough.",
      "author": "Harjinder & Simranpreet K., Doncaster",
      "date": "February 2026"
    },
    {
      "quote": "Priya refinanced our investment property and saved us $380/month off our repayments. She explained everything in plain English and followed up every step of the way.",
      "author": "David T., Box Hill",
      "date": "January 2026"
    },
    {
      "quote": "As a self-employed tradie I thought getting a loan would be a nightmare. Priya knew exactly which lenders would work with my situation and we got approved first time.",
      "author": "Marco V., Ringwood",
      "date": "December 2025"
    }
  ]'::jsonb,

  -- LinkedIn & booking
  'https://linkedin.com/in/priya-sharma-mb',
  'https://calendly.com/priya-sharma-mb/free-consult',
  'Book a free 30-minute discovery call with Priya. No obligation — just a friendly chat about your situation and how she can help.',

  -- Accepting clients
  true,

  -- Ideal client
  'First home buyers, property investors, multicultural families, and self-employed borrowers in Melbourne''s eastern suburbs who want clear, jargon-free mortgage advice.'
)
ON CONFLICT (slug) DO UPDATE SET
  firm_name              = EXCLUDED.firm_name,
  bio                    = EXCLUDED.bio,
  photo_url              = EXCLUDED.photo_url,
  phone                  = EXCLUDED.phone,
  website                = EXCLUDED.website,
  fee_structure          = EXCLUDED.fee_structure,
  fee_description        = EXCLUDED.fee_description,
  initial_consultation_free = EXCLUDED.initial_consultation_free,
  years_experience       = EXCLUDED.years_experience,
  avg_response_minutes   = EXCLUDED.avg_response_minutes,
  meeting_types          = EXCLUDED.meeting_types,
  qualifications         = EXCLUDED.qualifications,
  memberships            = EXCLUDED.memberships,
  languages              = EXCLUDED.languages,
  service_areas          = EXCLUDED.service_areas,
  education              = EXCLUDED.education,
  faqs                   = EXCLUDED.faqs,
  testimonials           = EXCLUDED.testimonials,
  linkedin_url           = EXCLUDED.linkedin_url,
  booking_link           = EXCLUDED.booking_link,
  booking_intro          = EXCLUDED.booking_intro,
  accepting_new_clients  = EXCLUDED.accepting_new_clients,
  ideal_client           = EXCLUDED.ideal_client,
  registration_number    = EXCLUDED.registration_number,
  abn                    = EXCLUDED.abn,
  profile_complete       = true;


-- 2. Seed approved reviews
DO $$
DECLARE
  priya_id integer;
BEGIN
  SELECT id INTO priya_id FROM professionals WHERE slug = 'priya-sharma';
  IF priya_id IS NULL THEN RETURN; END IF;

  -- Remove any existing seeded reviews to keep idempotent
  DELETE FROM professional_reviews
  WHERE professional_id = priya_id
    AND reviewer_email LIKE '%@seed.invest.com.au';

  INSERT INTO professional_reviews (
    professional_id, reviewer_name, reviewer_email,
    rating, communication_rating, expertise_rating, value_for_money_rating,
    title, body,
    verified, used_services, status, created_at
  ) VALUES

  (priya_id, 'Harjinder K.', 'harjinder@seed.invest.com.au',
   5, 5, 5, 5,
   'Made our first home a reality',
   'We had been knocked back by two brokers before finding Priya. She sat with us for nearly two hours on our first meeting, understood our situation completely, and found a lender that worked with Simranpreet''s maternity leave income. We settled in 6 weeks. I honestly cannot put into words how much she changed our lives.',
   true, true, 'approved', NOW() - INTERVAL '5 weeks'),

  (priya_id, 'David T.', 'david.t@seed.invest.com.au',
   5, 5, 5, 5,
   'Saved us $380/month on our investment loan',
   'Our previous broker set us up with a rate that had crept up over the years. Priya audited our loan, found a lender 0.6% lower, and managed the whole switch. The process took three weeks and we barely had to lift a finger. She now does an annual review for us every year.',
   true, true, 'approved', NOW() - INTERVAL '7 weeks'),

  (priya_id, 'Marco V.', 'marco.v@seed.invest.com.au',
   5, 5, 5, 5,
   'Finally! A broker who gets self-employed',
   'As a sole trader it''s always a battle to get loan approval. Priya knew exactly what to prepare, which lenders were flexible with two years ABN history, and what documentation would make the application strong. Approved first time, no dramas. Highly recommend.',
   true, true, 'approved', NOW() - INTERVAL '10 weeks'),

  (priya_id, 'Amandeep S.', 'amandeep.s@seed.invest.com.au',
   5, 5, 5, 5,
   'Brilliant — spoke to us in Punjabi too',
   'My parents don''t speak much English and Priya was able to explain everything to them directly in Punjabi. That was so important to us. She is patient, thorough, and genuinely cares about her clients. We are already referring our cousins to her.',
   true, true, 'approved', NOW() - INTERVAL '12 weeks'),

  (priya_id, 'Jennifer L.', 'jennifer.l@seed.invest.com.au',
   5, 5, 5, 4,
   'Professional and on top of everything',
   'Priya managed our second investment property purchase from start to finish. She knew exactly which lenders had the best investor rates and structured the loan to maximise our tax position as well. Very knowledgeable and always available for questions.',
   true, true, 'approved', NOW() - INTERVAL '15 weeks'),

  (priya_id, 'Rajan M.', 'rajan.m@seed.invest.com.au',
   5, 5, 5, 5,
   'Went above and beyond',
   'Priya helped us navigate a complicated purchase where the property had a second dwelling. Most brokers would have walked away. She found a solution, coordinated with the conveyancer, and kept us calm throughout. Settlement went smoothly.',
   true, true, 'approved', NOW() - INTERVAL '18 weeks'),

  (priya_id, 'Claire B.', 'claire.b@seed.invest.com.au',
   4, 5, 4, 4,
   'Great experience overall',
   'Priya was recommended to me by a friend and I can see why. She took the stress out of the whole mortgage process. Communication was excellent — she always responded same day. The only minor thing was the initial document checklist was a bit long, but I understand that''s just the process.',
   true, true, 'approved', NOW() - INTERVAL '22 weeks'),

  (priya_id, 'Steven K.', 'steven.k@seed.invest.com.au',
   5, 5, 5, 5,
   'Best broker we''ve ever used',
   'This is our fourth property and we''ve used three different brokers over the years. Priya is by far the best. She is organised, transparent about what she earns, and fought hard for us when the bank came back with a lower valuation than expected. She got it sorted. Will not use anyone else going forward.',
   true, true, 'approved', NOW() - INTERVAL '26 weeks');

END $$;
