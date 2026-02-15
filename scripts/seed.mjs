import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Read source data
const sourceData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/site-data.json'), 'utf-8')
)

async function seed() {
  console.log('Starting database seed...')

  // Clear existing data
  await supabase.from('scenarios').delete().neq('id', 0)
  await supabase.from('articles').delete().neq('id', 0)
  await supabase.from('brokers').delete().neq('id', 0)
  console.log('Cleared existing data')

  // Insert brokers
  const brokers = sourceData.brokers.map((b) => ({
    name: b.name,
    slug: b.slug,
    color: b.color,
    icon: b.icon,
    cta_text: b.ctaText,
    tagline: b.tagline,
    asx_fee: b.asxFee,
    asx_fee_value: b.asxFeeValue,
    us_fee: b.usFee,
    us_fee_value: b.usFeeValue,
    fx_rate: b.fxRate,
    chess_sponsored: b.chessSponsored,
    inactivity_fee: b.inactivityFee,
    payment_methods: b.paymentMethods,
    smsf_support: b.smsfSupport,
    is_crypto: b.isCrypto || false,
    min_deposit: b.minDeposit,
    platforms: b.platforms,
    pros: b.pros,
    cons: b.cons,
    affiliate_url: b.affiliateUrl,
    rating: b.rating,
    layer: b.layer,
    deal: b.dealOfMonth || false,
    deal_text: b.dealText,
    status: 'active',
  }))

  const { error: brokersError } = await supabase.from('brokers').insert(brokers)
  if (brokersError) {
    console.error('Error inserting brokers:', brokersError)
  } else {
    console.log(`Inserted ${brokers.length} brokers`)
  }

  // Deduplicate articles (remove CHESS copies)
  const uniqueArticles = sourceData.articles.filter(
    (article, index, self) =>
      index === self.findIndex((a) => a.slug === article.slug)
  )

  // Insert articles
  const articles = uniqueArticles.map((a) => ({
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category,
    sections: a.sections,
    tags: a.tags,
    read_time: a.readTime,
    related_brokers: a.relatedBrokers,
    related_calc: a.relatedCalc,
    evergreen: a.evergreen,
    published_at: a.date,
  }))

  const { error: articlesError } = await supabase.from('articles').insert(articles)
  if (articlesError) {
    console.error('Error inserting articles:', articlesError)
  } else {
    console.log(`Inserted ${articles.length} articles`)
  }

  // Insert scenarios
  const scenarios = sourceData.scenarios.map((s) => ({
    title: s.title,
    slug: s.slug,
    hero_title: s.heroTitle,
    icon: s.icon,
    problem: s.problem,
    solution: s.solution,
    brokers: s.brokers,
    considerations: s.considerations,
  }))

  const { error: scenariosError } = await supabase.from('scenarios').insert(scenarios)
  if (scenariosError) {
    console.error('Error inserting scenarios:', scenariosError)
  } else {
    console.log(`Inserted ${scenarios.length} scenarios`)
  }

  console.log('Database seeding completed!')
}

seed()
