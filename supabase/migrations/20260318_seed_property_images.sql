-- Seed property listing images with curated Unsplash photos
-- Each listing gets 3-5 images: exterior, interior, amenities, suburb context

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'the-operetta-paramatta';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'botanical-residences-south-melbourne';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1558036519-cf2b9e65b7d5?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'riverview-terrace-newstead';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1448630905060-59d64ae04aab?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'elara-marsden-park';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'yarra-one-south-yarra';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'west-village-west-end';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'haven-crows-nest';

UPDATE property_listings SET images = '[
  "https://images.unsplash.com/photo-1474823397925-4b4a4faedee5?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1527176930608-09cb256ab504?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&h=675&q=80&auto=format&fit=crop"
]' WHERE slug = 'aurora-melbourne-central';
