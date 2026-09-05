import React, { useState } from 'react'
import VisualizationEngine from './VisualizationEngine'
import { Calculator, TrendingUp, PieChart, BarChart3 } from 'lucide-react'

const MathVisualizer = ({ topic, problem, className = '' }) => {
  const [selectedVisualization, setSelectedVisualization] = useState('graph')
  const [parameters, setParameters] = useState({
    equation: 'x*x',
    a: 1,
    b: 0,
    c: 0
  })

  const visualizationTypes = {
    graph: {
      icon: TrendingUp,
      title: 'Function Graph',
      description: 'Visualize mathematical functions'
    },
    geometry: {
      icon: Calculator,
      title: 'Geometry Shapes',
      description: 'Interactive geometric shapes'
    },
    statistics: {
      icon: BarChart3,
      title: 'Statistics & Data',
      description: 'Charts and data visualization'
    },
    probability: {
      icon: PieChart,
      title: 'Probability',
      description: 'Probability distributions'
    }
  }

  const getVisualizationData = () => {
    switch (selectedVisualization) {
      case 'graph':
        return {
          equation: parameters.equation,
          domain: [-10, 10],
          range: [-10, 10]
        }
      
      case 'geometry':
        if (topic?.includes('triangle')) {
          return {
            shape: 'triangle',
            dimensions: { base: 200, height: 150 },
            showMeasurements: true
          }
        } else if (topic?.includes('circle')) {
          return {
            shape: 'circle',
            dimensions: { radius: 80 },
            showMeasurements: true
          }
        } else {
          return {
            shape: 'rectangle',
            dimensions: { width: 160, height: 100 },
            showMeasurements: true
          }
        }
      
      case 'statistics':
        return {
          chartType: 'bar',
          values: [25, 45, 30, 60, 35, 50],
          labels: ['A', 'B', 'C', 'D', 'E', 'F']
        }
      
      case 'probability':
        return {
          chartType: 'pie',
          values: [30, 25, 20, 15, 10],
          labels: ['Red', 'Blue', 'Green', 'Yellow', 'Purple']
        }
      
      default:
        return {}
    }
  }

  const mathExamples = {
    algebra: [
      {
        problem: "Solve: x² + 5x + 6 = 0",
        steps: [
          "Identify coefficients: a=1, b=5, c=6",
          "Use quadratic formula: x = (-b ± √(b²-4ac))/2a",
          "Calculate discriminant: b²-4ac = 25-24 = 1",
          "Find solutions: x = (-5 ± 1)/2",
          "Solutions: x = -2 or x = -3"
        ],
        visualization: { equation: 'x*x + 5*x + 6' }
      }
    ],
    geometry: [
      {
        problem: "Find the area of a triangle with base 10 and height 8",
        steps: [
          "Formula: Area = ½ × base × height",
          "Substitute values: Area = ½ × 10 × 8",
          "Calculate: Area = ½ × 80",
          "Result: Area = 40 square units"
        ],
        visualization: { shape: 'triangle', base: 10, height: 8 }
      }
    ],
    calculus: [
      {
        problem: "Find the derivative of f(x) = x³ + 2x²",
        steps: [
          "Apply power rule: d/dx(xⁿ) = nxⁿ⁻¹",
          "For x³: d/dx(x³) = 3x²",
          "For 2x²: d/dx(2x²) = 4x",
          "Combine: f'(x) = 3x² + 4x"
        ],
        visualization: { equation: 'x*x*x + 2*x*x' }
      }
    ]
  }

  const getCurrentExample = () => {
    if (topic?.includes('algebra')) return mathExamples.algebra[0]
    if (topic?.includes('geometry')) return mathExamples.geometry[0]
    if (topic?.includes('calculus')) return mathExamples.calculus[0]
    return mathExamples.algebra[0]
  }

  const currentExample = getCurrentExample()

  return (
    <div className={`space-y-4 md:space-y-6 p-3 md:p-4 ${className}`}>
      {/* Visualization Type Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-800">Choose Visualization Type</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {Object.entries(visualizationTypes).map(([key, type]) => {
            const Icon = type.icon
            return (
              <button
                key={key}
                onClick={() => setSelectedVisualization(key)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedVisualization === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">{type.title}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Interactive Controls */}
      {selectedVisualization === 'graph' && (
        <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
          <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-800">Function Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equation
              </label>
              <input
                type="text"
                value={parameters.equation}
                onChange={(e) => setParameters(prev => ({ ...prev, equation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., x*x, Math.sin(x), x*x*x + 2*x"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coefficient A
              </label>
              <input
                type="number"
                value={parameters.a}
                onChange={(e) => setParameters(prev => ({ ...prev, a: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coefficient B
              </label>
              <input
                type="number"
                value={parameters.b}
                onChange={(e) => setParameters(prev => ({ ...prev, b: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Visualization */}
      <VisualizationEngine
        type={selectedVisualization === 'graph' ? 'math-graph' : 
              selectedVisualization === 'geometry' ? 'geometry-shape' :
              'data-chart'}
        data={getVisualizationData()}
        subject="mathematics"
      />

      {/* Step-by-Step Solution */}
      {currentExample && (
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-800">
            📚 Step-by-Step Solution
          </h3>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <h4 className="font-semibold text-blue-800">Problem:</h4>
            <p className="text-blue-700">{currentExample.problem}</p>
          </div>

          <div className="space-y-3">
            {currentExample.steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-gray-700">{step}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="font-semibold text-green-800 mb-2">💡 Key Learning Points:</h5>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Visual representation helps understand the concept better</li>
              <li>• Each step builds upon the previous one</li>
              <li>• Practice with different values to see patterns</li>
              <li>• Use the interactive controls to explore variations</li>
            </ul>
          </div>
        </div>
      )}

      {/* Quick Examples */}
      <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-800">
          🎯 Try These Examples
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[
            { equation: 'x*x', name: 'Parabola', description: 'Basic quadratic function' },
            { equation: 'Math.sin(x)', name: 'Sine Wave', description: 'Trigonometric function' },
            { equation: 'x*x*x', name: 'Cubic', description: 'Third-degree polynomial' },
            { equation: '1/x', name: 'Hyperbola', description: 'Rational function' },
            { equation: 'Math.abs(x)', name: 'Absolute Value', description: 'V-shaped graph' },
            { equation: 'Math.log(x)', name: 'Logarithm', description: 'Logarithmic function' }
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => setParameters(prev => ({ ...prev, equation: example.equation }))}
              className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-gray-800">{example.name}</div>
              <div className="text-sm text-gray-600 mt-1">{example.description}</div>
              <div className="text-xs text-blue-600 mt-2 font-mono">{example.equation}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MathVisualizer