import React, { useState } from 'react'
import VisualizationEngine from './VisualizationEngine'
import MathVisualizer from './MathVisualizer'
import ScienceVisualizer from './ScienceVisualizer'

const VisualizationDemo = () => {
  const [activeDemo, setActiveDemo] = useState('math-graph')

  const demos = {
    'math-graph': {
      title: 'Mathematical Functions',
      component: VisualizationEngine,
      props: {
        type: 'math-graph',
        data: { equation: 'x*x', domain: [-5, 5], range: [-5, 25] },
        subject: 'mathematics'
      }
    },
    'physics-motion': {
      title: 'Physics Motion',
      component: VisualizationEngine,
      props: {
        type: 'physics-motion',
        data: { type: 'projectile', velocity: 20, acceleration: 9.8, time: 4 },
        subject: 'physics'
      }
    },
    'chemistry-molecule': {
      title: 'Chemistry Molecules',
      component: VisualizationEngine,
      props: {
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
        subject: 'chemistry'
      }
    },
    'biology-cell': {
      title: 'Biology Cell Structure',
      component: VisualizationEngine,
      props: {
        type: 'biology-cell',
        data: {
          cellType: 'animal',
          organelles: [
            { type: 'nucleus', name: 'Nucleus', x: 250, y: 200, size: 40, color: '#8b5cf6' },
            { type: 'mitochondria', name: 'Mitochondria', x: 180, y: 150, size: 20, color: '#ef4444' },
            { type: 'mitochondria', name: 'Mitochondria', x: 320, y: 250, size: 20, color: '#ef4444' }
          ]
        },
        subject: 'biology'
      }
    },
    'geometry-shape': {
      title: 'Geometry Shapes',
      component: VisualizationEngine,
      props: {
        type: 'geometry-shape',
        data: { shape: 'triangle', dimensions: { base: 200, height: 150 }, showMeasurements: true },
        subject: 'mathematics'
      }
    }
  }

  const currentDemo = demos[activeDemo]
  const DemoComponent = currentDemo.component

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎨 Interactive Learning Visualizations Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Experience how complex concepts become easy to understand with interactive visualizations
          </p>

          {/* Demo Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {Object.entries(demos).map(([key, demo]) => (
              <button
                key={key}
                onClick={() => setActiveDemo(key)}
                className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                  activeDemo === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                {demo.title}
              </button>
            ))}
          </div>

          {/* Current Demo */}
          <DemoComponent {...currentDemo.props} />

          {/* Benefits Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🧠 Better Understanding</h3>
              <p className="text-blue-700 text-sm">
                Visual representations help students grasp complex concepts faster and retain information longer.
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">🎮 Interactive Learning</h3>
              <p className="text-green-700 text-sm">
                Students can manipulate parameters and see real-time changes, making learning engaging and fun.
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">📊 Multi-Subject Support</h3>
              <p className="text-purple-700 text-sm">
                From mathematics to biology, visualizations cover all subjects with appropriate animations.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">✨ Visualization Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 What Students Get:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Interactive animations for complex concepts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Real-time parameter manipulation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Step-by-step visual explanations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Download and share visualizations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Multi-speed animations</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📚 Subject Coverage:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">📐</span>
                  <span><strong>Mathematics:</strong> Functions, geometry, statistics</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">⚡</span>
                  <span><strong>Physics:</strong> Motion, forces, waves, electricity</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">🧪</span>
                  <span><strong>Chemistry:</strong> Molecules, reactions, bonding</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 mt-1">🌱</span>
                  <span><strong>Biology:</strong> Cells, processes, ecosystems</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-cyan-500 mt-1">🌍</span>
                  <span><strong>Geography:</strong> Earth processes, climate</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-800 mb-2">🚀 Coming Soon:</h4>
            <p className="text-gray-700 text-sm">
              Advanced features including 3D visualizations, VR support, collaborative learning spaces, 
              and AI-powered personalized visual explanations based on student learning patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizationDemo