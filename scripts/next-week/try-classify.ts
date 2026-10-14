/**
 * One-off real-model check of the product -> item mapping on a small sample (at most 50 names, 30 per call).
 * Usage: ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/next-week/try-classify.ts
 * Prints the answers and the tokens used; the answers are saved as a test fixture by hand.
 */
import { claudeClassifier, type TokenUsage } from '@/lib/nextWeek/classifyProducts'

const NAMES = [
  "Sainsbury's Whole Cucumber", 'JS Whole Cucumber', "Sainsbury's Semi Skimmed Milk 4 Pints", 'Bananas Loose',
  "Sainsbury's Free Range Eggs Large x12", 'Warburtons White Pittas x4', 'Pepsi Max 2L', 'Fitzgeralds Sourdough Bagels',
  'Müller Light Strawberry', 'Round Tomatoes x6', 'Strawberries 250g', 'Bavarian Smoked Ham Slices',
  "Sainsbury's Grated Mozzarella 250g", 'White Seedless Grapes 500g', 'Sabra Houmous 200g', 'Nurofen 200mg x16',
  'Toilet Tissue x16', 'Nutella 350g', 'Summer Fruits Squash 1L', 'Carrots 500g',
  "Sainsbury's Taste the Difference Beef Mince 5% Fat", "Sainsbury's British Fresh Turkey Mince 2% Fat 500g",
  'Napolina Fusilli 1kg', 'Schwartz Garam Masala 35g', "Sainsbury's Extra Virgin Olive Oil 1L", 'Old El Paso Fajita Dinner Kit',
  'Jordans Apple and Berry Granola', "Sainsbury's Golden Breadcrumbs 175g", 'Birds Eye Garden Peas 1kg', 'Fairy Non Bio Laundry Liquid 1.3L',
  "Sainsbury's Salmon Fillets x4", 'Red Pepper', 'Heinz Tomato Ketchup 460g', 'Basmati Rice 2kg', "Sainsbury's Plain Flour 1.5kg",
  'Kellogg\'s Coco Pops 640g', 'Blue Riband Hazelnut x6', "Sainsbury's Chicken Breast Fillets 650g", 'Oxo Chicken Stock Cubes x12', 'Colgate Total Toothpaste 75ml',
  'Pukka Chai Tea', 'Quorn Pieces 300g', 'Kitchen Roll x4', 'Tinned Chickpeas 400g', 'Sainsbury\'s Whole Lemons x4', 'Cathedral City Mature Cheddar 350g',
  'Frozen Fish Fingers x10', 'Warburtons Medium Sliced White Bread', 'Dolmio Bolognese Sauce 500g', 'Ground Cumin 40g',
]

async function main() {
  const usage: TokenUsage = { input: 0, output: 0 }
  const classify = claudeClassifier(usage)
  const answers = [...(await classify(NAMES.slice(0, 30))), ...(await classify(NAMES.slice(30)))]
  for (const a of answers) console.log(`${a.name.padEnd(55)} -> ${a.item} | ${a.aisle} | ${a.cupboard ? 'cupboard' : ''}`)
  console.log(`\n${answers.length}/${NAMES.length} answered; tokens in ${usage.input}, out ${usage.output}`)
  console.log(JSON.stringify(answers))
}
main()
