import React, { useState } from 'react'
import VisualizationEngine from './VisualizationEngine'
import { Atom, Zap, Droplets, Leaf, Eye, Microscope } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useBilingualAI } from '../hooks/useBilingualAI'
import BilingualMessage from './BilingualMessage'

const ScienceVisualizer = ({ subject, topic, className = '' }) => {
  const { user } = useAuth()
  const { getBilingual, isTranslating } = useBilingualAI()
  
  const [selectedDemo, setSelectedDemo] = useState('physics')
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [showDoubtSection, setShowDoubtSection] = useState(false)
  const [userDoubt, setUserDoubt] = useState('')
  const [doubtAnswer, setDoubtAnswer] = useState(null)
  const [bilingualAnswer, setBilingualAnswer] = useState(null)

  const scienceVisualizations = {
    physics: {
      icon: Zap,
      title: 'Physics Simulations',
      description: 'Motion, forces, and energy',
      demos: [
        {
          name: 'Projectile Motion',
          type: 'physics-motion',
          data: {
            type: 'projectile',
            velocity: 20,
            acceleration: 9.8,
            time: 4
          },
          explanation: "Objects follow a parabolic path when launched at an angle due to gravity."
        },
        {
          name: 'Uniform Motion',
          type: 'physics-motion',
          data: {
            type: 'uniform',
            velocity: 15,
            time: 5
          },
          explanation: "Objects moving at constant velocity travel equal distances in equal time intervals."
        },
        {
          name: 'Accelerated Motion',
          type: 'physics-motion',
          data: {
            type: 'accelerated',
            velocity: 5,
            acceleration: 3,
            time: 6
          },
          explanation: "Objects with constant acceleration increase their velocity uniformly over time."
        },
        {
          name: 'Pendulum Motion',
          type: 'physics-motion',
          data: {
            type: 'pendulum',
            length: 1,
            angle: 30,
            time: 10
          },
          explanation: "A pendulum swings back and forth due to gravity, demonstrating periodic motion and energy conversion."
        },
        {
          name: 'Electric Circuit',
          type: 'physics-circuit',
          data: {
            voltage: 12,
            resistance: 4,
            current: 3
          },
          explanation: "Electric current flows through a circuit following Ohm's Law: V = IR"
        },
        {
          name: 'Wave Motion',
          type: 'physics-wave',
          data: {
            amplitude: 2,
            frequency: 1,
            wavelength: 4
          },
          explanation: "Waves transfer energy through oscillations without transferring matter."
        }
      ]
    },
    chemistry: {
      icon: Atom,
      title: 'Chemistry Models',
      description: 'Molecules and reactions',
      demos: [
        {
          name: 'Water Molecule (H₂O)',
          type: 'chemistry-molecule',
          data: {
            molecule: 'H₂O',
            atoms: [
              { element: 'O', x: 250, y: 200, radius: 25 },
              { element: 'H', x: 200, y: 170, radius: 15 },
              { element: 'H', x: 300, y: 170, radius: 15 }
            ],
            bonds: [
              { from: 0, to: 1, type: 'single' },
              { from: 0, to: 2, type: 'single' }
            ]
          },
          explanation: "Water consists of two hydrogen atoms bonded to one oxygen atom at an angle of 104.5°."
        },
        {
          name: 'Methane (CH₄)',
          type: 'chemistry-molecule',
          data: {
            molecule: 'CH₄',
            atoms: [
              { element: 'C', x: 250, y: 200, radius: 20 },
              { element: 'H', x: 220, y: 170, radius: 12 },
              { element: 'H', x: 280, y: 170, radius: 12 },
              { element: 'H', x: 220, y: 230, radius: 12 },
              { element: 'H', x: 280, y: 230, radius: 12 }
            ],
            bonds: [
              { from: 0, to: 1, type: 'single' },
              { from: 0, to: 2, type: 'single' },
              { from: 0, to: 3, type: 'single' },
              { from: 0, to: 4, type: 'single' }
            ]
          },
          explanation: "Methane has a tetrahedral structure with carbon at the center bonded to four hydrogen atoms."
        },
        {
          name: 'Carbon Dioxide (CO₂)',
          type: 'chemistry-molecule',
          data: {
            molecule: 'CO₂',
            atoms: [
              { element: 'C', x: 250, y: 200, radius: 20 },
              { element: 'O', x: 180, y: 200, radius: 18 },
              { element: 'O', x: 320, y: 200, radius: 18 }
            ],
            bonds: [
              { from: 0, to: 1, type: 'double' },
              { from: 0, to: 2, type: 'double' }
            ]
          },
          explanation: "CO₂ is linear with carbon double-bonded to two oxygen atoms, making it a greenhouse gas."
        },
        {
          name: 'Ammonia (NH₃)',
          type: 'chemistry-molecule',
          data: {
            molecule: 'NH₃',
            atoms: [
              { element: 'N', x: 250, y: 200, radius: 22 },
              { element: 'H', x: 210, y: 170, radius: 12 },
              { element: 'H', x: 290, y: 170, radius: 12 },
              { element: 'H', x: 250, y: 240, radius: 12 }
            ],
            bonds: [
              { from: 0, to: 1, type: 'single' },
              { from: 0, to: 2, type: 'single' },
              { from: 0, to: 3, type: 'single' }
            ]
          },
          explanation: "Ammonia has a pyramidal shape with nitrogen bonded to three hydrogen atoms."
        },
        {
          name: 'Oxygen (O₂)',
          type: 'chemistry-molecule',
          data: {
            molecule: 'O₂',
            atoms: [
              { element: 'O', x: 220, y: 200, radius: 22 },
              { element: 'O', x: 280, y: 200, radius: 22 }
            ],
            bonds: [
              { from: 0, to: 1, type: 'double' }
            ]
          },
          explanation: "Oxygen gas consists of two oxygen atoms double-bonded together, essential for respiration."
        },
        {
          name: 'Sodium Chloride (NaCl)',
          type: 'chemistry-molecule',
          data: {
            molecule: 'NaCl',
            atoms: [
              { element: 'Na', x: 220, y: 200, radius: 24 },
              { element: 'Cl', x: 280, y: 200, radius: 26 }
            ],
            bonds: [
              { from: 0, to: 1, type: 'ionic' }
            ]
          },
          explanation: "Table salt forms through ionic bonding between sodium and chlorine atoms."
        }
      ]
    },
    biology: {
      icon: Leaf,
      title: 'Biology Systems',
      description: 'Cells and life processes',
      demos: [
        {
          name: 'Animal Cell',
          type: 'biology-cell',
          data: {
            cellType: 'animal',
            organelles: [
              { type: 'nucleus', name: 'Nucleus', x: 250, y: 200, size: 40, color: '#8b5cf6' },
              { type: 'mitochondria', name: 'Mitochondria', x: 180, y: 150, size: 20, color: '#ef4444' },
              { type: 'mitochondria', name: 'Mitochondria', x: 320, y: 250, size: 20, color: '#ef4444' },
              { type: 'ribosome', name: 'Ribosomes', x: 200, y: 250, size: 8, color: '#10b981' },
              { type: 'ribosome', name: 'Ribosomes', x: 300, y: 150, size: 8, color: '#10b981' },
              { type: 'golgi', name: 'Golgi Body', x: 180, y: 220, size: 15, color: '#f59e0b' }
            ]
          },
          explanation: "Animal cells have a nucleus, mitochondria for energy, and various organelles for different functions."
        },
        {
          name: 'Plant Cell',
          type: 'biology-cell',
          data: {
            cellType: 'plant',
            organelles: [
              { type: 'nucleus', name: 'Nucleus', x: 250, y: 200, size: 35, color: '#8b5cf6' },
              { type: 'chloroplast', name: 'Chloroplast', x: 150, y: 150, size: 25, color: '#059669' },
              { type: 'chloroplast', name: 'Chloroplast', x: 350, y: 250, size: 25, color: '#059669' },
              { type: 'vacuole', name: 'Vacuole', x: 300, y: 180, size: 30, color: '#06b6d4' },
              { type: 'mitochondria', name: 'Mitochondria', x: 180, y: 250, size: 18, color: '#ef4444' }
            ]
          },
          explanation: "Plant cells have chloroplasts for photosynthesis, a large vacuole, and a rigid cell wall."
        }
      ]
    }
  }

  const getCurrentDemo = () => {
    return scienceVisualizations[selectedDemo]?.demos[0] || scienceVisualizations.physics.demos[0]
  }

  const [currentDemoIndex, setCurrentDemoIndex] = useState(0)
  const currentDemo = scienceVisualizations[selectedDemo]?.demos[currentDemoIndex] || getCurrentDemo()

  const scienceExplanations = {
    physics: {
      concepts: [
        "Newton's Laws of Motion govern how objects move",
        "Energy is conserved but can change forms",
        "Forces cause acceleration (F = ma)",
        "Gravity affects all objects equally"
      ],
      formulas: [
        "Distance = Speed × Time",
        "Force = Mass × Acceleration",
        "Kinetic Energy = ½mv²",
        "Potential Energy = mgh"
      ]
    },
    chemistry: {
      concepts: [
        "Atoms bond to form molecules",
        "Chemical reactions rearrange atoms",
        "Electrons determine bonding behavior",
        "Molecular shape affects properties"
      ],
      formulas: [
        "Avogadro's Number = 6.022 × 10²³",
        "PV = nRT (Ideal Gas Law)",
        "pH = -log[H⁺]",
        "Rate = k[A]ᵐ[B]ⁿ"
      ]
    },
    biology: {
      concepts: [
        "Cells are the basic units of life",
        "DNA contains genetic information",
        "Photosynthesis converts light to energy",
        "Evolution explains biodiversity"
      ],
      formulas: [
        "Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
        "Cellular Respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP",
        "Hardy-Weinberg: p² + 2pq + q² = 1",
        "Population Growth: dN/dt = rN"
      ]
    }
  }

  return (
    <div className={`space-y-4 md:space-y-6 p-3 md:p-4 ${className}`}>
      {/* Subject Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-800">Choose Science Subject</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {Object.entries(scienceVisualizations).map(([key, subject]) => {
            const Icon = subject.icon
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedDemo(key)
                  setCurrentDemoIndex(0)
                }}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedDemo === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <Icon className="h-8 w-8 mx-auto mb-3" />
                <div className="font-semibold">{subject.title}</div>
                <div className="text-sm text-gray-500 mt-1">{subject.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Demo Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
        <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-800">
          {scienceVisualizations[selectedDemo]?.title} Demonstrations
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {scienceVisualizations[selectedDemo]?.demos.map((demo, index) => (
            <button
              key={index}
              onClick={() => setCurrentDemoIndex(index)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                currentDemoIndex === index
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-green-300 text-gray-700'
              }`}
            >
              <div className="font-medium">{demo.name}</div>
              <div className="text-sm text-gray-500 mt-1">{demo.explanation}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
        <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-800">Animation Settings</h4>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Speed:</label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600">{animationSpeed}x</span>
        </div>
      </div>

      {/* Main Visualization */}
      <VisualizationEngine
        type={currentDemo.type}
        data={currentDemo.data}
        subject={selectedDemo}
      />

      {/* Explanation Panel */}
      <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-800">
          🔬 Scientific Explanation
        </h3>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 md:p-4 mb-4 md:mb-6">
          <h4 className="text-sm md:text-base font-semibold text-blue-800 mb-2">{currentDemo.name}</h4>
          <p className="text-sm md:text-base text-blue-700">{currentDemo.explanation}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Key Concepts */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-purple-500" />
              Key Concepts
            </h4>
            <ul className="space-y-2">
              {scienceExplanations[selectedDemo]?.concepts.map((concept, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{concept}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Important Formulas */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Microscope className="h-5 w-5 mr-2 text-green-500" />
              Important Formulas
            </h4>
            <ul className="space-y-2">
              {scienceExplanations[selectedDemo]?.formulas.map((formula, index) => (
                <li key={index} className="bg-gray-50 p-2 rounded font-mono text-sm">
                  {formula}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Interactive Questions */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="font-semibold text-yellow-800 mb-3">🤔 Think About This:</h5>
          <div className="space-y-2 text-yellow-700">
            {selectedDemo === 'physics' && (
              <>
                <p>• What happens to the motion if we change the initial velocity?</p>
                <p>• How does gravity affect different objects?</p>
                <p>• Can you predict where the object will land?</p>
              </>
            )}
            {selectedDemo === 'chemistry' && (
              <>
                <p>• Why do atoms form bonds with each other?</p>
                <p>• How does molecular shape affect properties?</p>
                <p>• What determines the number of bonds an atom can form?</p>
              </>
            )}
            {selectedDemo === 'biology' && (
              <>
                <p>• What makes plant cells different from animal cells?</p>
                <p>• How do organelles work together in a cell?</p>
                <p>• Why are cells considered the basic units of life?</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Related Topics */}
      <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-800">
          🔗 Related Topics to Explore
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {selectedDemo === 'physics' && [
            { title: 'Energy Conservation', description: 'How energy transforms but never disappears' },
            { title: 'Wave Motion', description: 'Understanding sound and light waves' },
            { title: 'Electromagnetic Forces', description: 'Electric and magnetic interactions' }
          ].map((topic, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
              <div className="font-medium text-gray-800">{topic.title}</div>
              <div className="text-sm text-gray-600 mt-1">{topic.description}</div>
            </div>
          ))}
          
          {selectedDemo === 'chemistry' && [
            { title: 'Chemical Reactions', description: 'How molecules interact and change' },
            { title: 'Periodic Table', description: 'Organization of elements by properties' },
            { title: 'Acids and Bases', description: 'pH and chemical equilibrium' }
          ].map((topic, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
              <div className="font-medium text-gray-800">{topic.title}</div>
              <div className="text-sm text-gray-600 mt-1">{topic.description}</div>
            </div>
          ))}
          
          {selectedDemo === 'biology' && [
            { title: 'Photosynthesis', description: 'How plants convert light to energy' },
            { title: 'DNA Structure', description: 'The blueprint of life' },
            { title: 'Evolution', description: 'How species change over time' }
          ].map((topic, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
              <div className="font-medium text-gray-800">{topic.title}</div>
              <div className="text-sm text-gray-600 mt-1">{topic.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Doubt Clearing Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
            <Microscope className="h-6 w-6 mr-2 text-purple-600" />
            💡 Clear Your Doubts
          </h3>
          <button
            onClick={() => setShowDoubtSection(!showDoubtSection)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            {showDoubtSection ? 'Hide' : 'Ask Question'}
          </button>
        </div>

        {showDoubtSection && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your question about {scienceVisualizations[selectedDemo]?.title}?
              </label>
              <textarea
                value={userDoubt}
                onChange={(e) => setUserDoubt(e.target.value)}
                placeholder="e.g., Why does a ball thrown upward come back down?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>

            <button
              onClick={async () => {
                if (userDoubt.trim()) {
                  // Generate answer in English
                  const answer = generateDoubtAnswer(userDoubt, selectedDemo)
                  setDoubtAnswer(answer)
                  
                  // Get bilingual version
                  const bilingual = await getBilingual(answer)
                  setBilingualAnswer(bilingual)
                }
              }}
              disabled={!userDoubt.trim() || isTranslating}
              className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTranslating ? 'Translating...' : 'Get Answer'}
            </button>

            {bilingualAnswer && (
              <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                <h4 className="font-semibold text-purple-800 mb-2">Answer:</h4>
                <BilingualMessage
                  englishText={bilingualAnswer.english}
                  translatedText={bilingualAnswer.motherTongue}
                  language={bilingualAnswer.language}
                  nativeName={bilingualAnswer.nativeName}
                />
              </div>
            )}
          </div>
        )}

        {/* Common Questions */}
        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">🔥 Frequently Asked Questions:</h4>
          <div className="space-y-3">
            {selectedDemo === 'physics' && [
              {
                q: "Why do objects fall at the same rate regardless of mass?",
                a: "Galileo discovered that in the absence of air resistance, all objects fall at the same rate because gravity accelerates all masses equally (9.8 m/s²). The force is proportional to mass (F=mg), but acceleration (a=F/m) cancels out the mass, leaving only g."
              },
              {
                q: "What is the difference between speed and velocity?",
                a: "Speed is how fast something moves (scalar), while velocity includes both speed and direction (vector). A car going 60 km/h north has a different velocity than one going 60 km/h south, but the same speed."
              },
              {
                q: "How does a pendulum demonstrate energy conservation?",
                a: "A pendulum converts potential energy (at highest points) to kinetic energy (at lowest point) and back. The total energy remains constant, demonstrating the law of conservation of energy."
              }
            ].map((faq, index) => (
              <details key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                <summary className="font-medium text-gray-800 cursor-pointer hover:text-purple-600">
                  {faq.q}
                </summary>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}

            {selectedDemo === 'chemistry' && [
              {
                q: "Why do atoms form bonds?",
                a: "Atoms form bonds to achieve a stable electron configuration, usually by filling their outer electron shell. This makes them more stable and lower in energy. Atoms can share electrons (covalent bonds) or transfer electrons (ionic bonds)."
              },
              {
                q: "What determines if a bond is ionic or covalent?",
                a: "The difference in electronegativity between atoms determines bond type. Large differences (>1.7) create ionic bonds where electrons transfer. Small differences create covalent bonds where electrons are shared."
              },
              {
                q: "Why is water a polar molecule?",
                a: "Water is polar because oxygen is more electronegative than hydrogen, pulling shared electrons closer. This creates a partial negative charge on oxygen and partial positive charges on hydrogens, making water an excellent solvent."
              },
              {
                q: "What is the pH scale?",
                a: "pH measures acidity/basicity on a scale of 0-14. pH 7 is neutral (pure water), below 7 is acidic (more H⁺ ions), above 7 is basic (more OH⁻ ions). Each unit represents a 10x change in concentration."
              }
            ].map((faq, index) => (
              <details key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                <summary className="font-medium text-gray-800 cursor-pointer hover:text-purple-600">
                  {faq.q}
                </summary>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}

            {selectedDemo === 'biology' && [
              {
                q: "What's the difference between plant and animal cells?",
                a: "Plant cells have cell walls, chloroplasts for photosynthesis, and large central vacuoles. Animal cells have centrioles and are generally smaller. Both have nuclei, mitochondria, and cell membranes."
              },
              {
                q: "How does photosynthesis work?",
                a: "Plants use chlorophyll to capture light energy, converting CO₂ and water into glucose and oxygen. The equation is: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. This process occurs in chloroplasts."
              },
              {
                q: "What is DNA and why is it important?",
                a: "DNA (deoxyribonucleic acid) is the molecule that stores genetic information. It's a double helix made of nucleotides that code for proteins. DNA is passed from parents to offspring, determining inherited traits."
              }
            ].map((faq, index) => (
              <details key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                <summary className="font-medium text-gray-800 cursor-pointer hover:text-purple-600">
                  {faq.q}
                </summary>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to generate doubt answers
const generateDoubtAnswer = (question, subject) => {
  const lowerQuestion = question.toLowerCase()
  
  // Physics answers
  if (subject === 'physics') {
    if (lowerQuestion.includes('gravity') || lowerQuestion.includes('fall')) {
      return "Gravity is a fundamental force that attracts all objects with mass toward each other. On Earth, gravity accelerates objects at 9.8 m/s² downward. This is why objects fall - Earth's gravity pulls them down. The acceleration is the same for all objects regardless of their mass (in vacuum)."
    }
    if (lowerQuestion.includes('force') || lowerQuestion.includes('newton')) {
      return "Newton's Laws explain how forces affect motion: 1) Objects stay at rest or in motion unless acted upon by a force. 2) Force equals mass times acceleration (F=ma). 3) Every action has an equal and opposite reaction. Forces cause objects to accelerate, change direction, or deform."
    }
    if (lowerQuestion.includes('energy')) {
      return "Energy is the capacity to do work. It comes in many forms: kinetic (motion), potential (position), thermal (heat), chemical, electrical, etc. Energy cannot be created or destroyed, only converted from one form to another (Law of Conservation of Energy)."
    }
    return "Great question! In physics, we study how objects move and interact through forces and energy. The key is understanding that everything follows predictable laws. Try breaking down your question into smaller parts: What moves? What forces act on it? What energy changes occur?"
  }
  
  // Chemistry answers
  if (subject === 'chemistry') {
    if (lowerQuestion.includes('atom') || lowerQuestion.includes('molecule')) {
      return "Atoms are the smallest units of elements, made of protons, neutrons, and electrons. Molecules form when atoms bond together. The type of bond (ionic, covalent, metallic) depends on how electrons are shared or transferred between atoms. This determines the molecule's properties."
    }
    if (lowerQuestion.includes('bond') || lowerQuestion.includes('bonding')) {
      return "Chemical bonds form when atoms share or transfer electrons to achieve stable electron configurations. Covalent bonds involve sharing electrons (like in H₂O). Ionic bonds involve transferring electrons (like in NaCl). The bond type affects the substance's properties like melting point and conductivity."
    }
    if (lowerQuestion.includes('reaction')) {
      return "Chemical reactions occur when bonds break and new bonds form, rearranging atoms into new substances. Reactions follow the law of conservation of mass - atoms aren't created or destroyed, just rearranged. Energy is either released (exothermic) or absorbed (endothermic) during reactions."
    }
    if (lowerQuestion.includes('ph') || lowerQuestion.includes('acid') || lowerQuestion.includes('base')) {
      return "pH measures the concentration of H⁺ ions in a solution. Acids release H⁺ ions (pH < 7), bases release OH⁻ ions (pH > 7), and neutral solutions have pH = 7. The pH scale is logarithmic, so each unit represents a 10-fold change in acidity."
    }
    return "Excellent chemistry question! Chemistry is all about how atoms interact and form new substances. Think about: What atoms are involved? How are they bonded? What happens to electrons? Understanding electron behavior is key to understanding chemistry!"
  }
  
  // Biology answers
  if (subject === 'biology') {
    if (lowerQuestion.includes('cell')) {
      return "Cells are the basic units of life. They contain organelles that perform specific functions: nucleus (genetic control), mitochondria (energy production), ribosomes (protein synthesis), etc. Plant cells have additional structures like cell walls and chloroplasts. All living things are made of cells."
    }
    if (lowerQuestion.includes('dna') || lowerQuestion.includes('gene')) {
      return "DNA is the molecule that stores genetic information in a double helix structure. Genes are segments of DNA that code for specific proteins. DNA is made of four nucleotides (A, T, G, C) whose sequence determines genetic traits. DNA replicates to pass information to new cells."
    }
    if (lowerQuestion.includes('photosynthesis')) {
      return "Photosynthesis is how plants convert light energy into chemical energy (glucose). Chlorophyll in chloroplasts captures light, which powers the conversion of CO₂ and water into glucose and oxygen. This process is essential for life on Earth as it produces oxygen and food."
    }
    return "Great biology question! Biology studies living organisms and life processes. Consider: What living thing or process are you asking about? What is its function? How does it help the organism survive? Biology is all about understanding how life works!"
  }
  
  return "That's an interesting question! To give you the best answer, try to be more specific about what aspect you're curious about. What exactly would you like to understand better?"
}

export default ScienceVisualizer