import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Download } from 'lucide-react'

const VisualizationEngine = ({ type, data, subject, className = '' }) => {
  const canvasRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [zoom, setZoom] = useState(1)
  const animationRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current) {
      drawVisualization()
    }
  }, [type, data, currentStep, zoom])

  const drawVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(zoom, zoom)

    switch (type) {
      case 'math-graph':
        drawMathGraph(ctx, data)
        break
      case 'physics-motion':
        drawPhysicsMotion(ctx, data)
        break
      case 'chemistry-molecule':
        drawChemistryMolecule(ctx, data)
        break
      case 'biology-cell':
        drawBiologyCell(ctx, data)
        break
      case 'geometry-shape':
        drawGeometryShape(ctx, data)
        break
      case 'data-chart':
        drawDataChart(ctx, data)
        break
      default:
        drawDefault(ctx)
    }

    ctx.restore()
  }

  const drawMathGraph = (ctx, data) => {
    const { equation, domain = [-10, 10], range = [-10, 10] } = data
    
    // Draw axes
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    
    // X-axis
    ctx.beginPath()
    ctx.moveTo(50, 200)
    ctx.lineTo(450, 200)
    ctx.stroke()
    
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(250, 50)
    ctx.lineTo(250, 350)
    ctx.stroke()
    
    // Draw grid
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    for (let i = 0; i <= 20; i++) {
      const x = 50 + i * 20
      const y = 50 + i * 15
      
      ctx.beginPath()
      ctx.moveTo(x, 50)
      ctx.lineTo(x, 350)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(50, y)
      ctx.lineTo(450, y)
      ctx.stroke()
    }
    
    // Draw function
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.beginPath()
    
    for (let x = domain[0]; x <= domain[1]; x += 0.1) {
      const y = evaluateEquation(equation, x)
      const canvasX = 250 + x * 20
      const canvasY = 200 - y * 20
      
      if (x === domain[0]) {
        ctx.moveTo(canvasX, canvasY)
      } else {
        ctx.lineTo(canvasX, canvasY)
      }
    }
    ctx.stroke()
    
    // Add labels
    ctx.fillStyle = '#333'
    ctx.font = '14px Arial'
    ctx.fillText('x', 460, 205)
    ctx.fillText('y', 255, 45)
    ctx.fillText(equation, 60, 80)
  }

  const drawPhysicsMotion = (ctx, data) => {
    const { type: motionType, velocity, acceleration, time } = data
    const t = (currentStep / 100) * (time || 5)
    
    // Draw ground
    ctx.fillStyle = '#8b5cf6'
    ctx.fillRect(0, 320, 500, 80)
    
    // Calculate position based on motion type
    let x = 50
    let y = 300
    
    if (motionType === 'projectile') {
      x = 50 + velocity * Math.cos(Math.PI / 4) * t * 20
      y = 300 - (velocity * Math.sin(Math.PI / 4) * t - 0.5 * 9.8 * t * t) * 5
    } else if (motionType === 'uniform') {
      x = 50 + velocity * t * 10
    } else if (motionType === 'accelerated') {
      x = 50 + (velocity * t + 0.5 * acceleration * t * t) * 10
    }
    
    // Draw object
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(Math.max(50, Math.min(450, x)), Math.max(50, Math.min(300, y)), 15, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw velocity vector
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + velocity * 2, y)
    ctx.stroke()
    
    // Add labels
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.fillText(`t = ${t.toFixed(1)}s`, 20, 30)
    ctx.fillText(`v = ${velocity}m/s`, 20, 50)
    if (acceleration) ctx.fillText(`a = ${acceleration}m/s²`, 20, 70)
  }

  const drawChemistryMolecule = (ctx, data) => {
    const { molecule, atoms, bonds } = data
    
    // Draw atoms
    atoms.forEach((atom, index) => {
      const colors = {
        'H': '#ffffff',
        'C': '#333333',
        'O': '#ff0000',
        'N': '#0000ff',
        'S': '#ffff00'
      }
      
      ctx.fillStyle = colors[atom.element] || '#888888'
      ctx.beginPath()
      ctx.arc(atom.x, atom.y, atom.radius || 20, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Add element label
      ctx.fillStyle = atom.element === 'H' ? '#000' : '#fff'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(atom.element, atom.x, atom.y + 5)
    })
    
    // Draw bonds
    bonds.forEach(bond => {
      const atom1 = atoms[bond.from]
      const atom2 = atoms[bond.to]
      
      ctx.strokeStyle = '#333'
      ctx.lineWidth = bond.type === 'double' ? 4 : bond.type === 'triple' ? 6 : 2
      ctx.beginPath()
      ctx.moveTo(atom1.x, atom1.y)
      ctx.lineTo(atom2.x, atom2.y)
      ctx.stroke()
    })
    
    // Add molecule name
    ctx.fillStyle = '#333'
    ctx.font = '16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(molecule, 20, 30)
  }

  const drawBiologyCell = (ctx, data) => {
    const { cellType, organelles } = data
    
    // Draw cell membrane
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 4
    ctx.beginPath()
    if (cellType === 'plant') {
      ctx.rect(50, 50, 400, 300)
      // Cell wall
      ctx.strokeStyle = '#059669'
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 2
      ctx.rect(60, 60, 380, 280)
    } else {
      ctx.arc(250, 200, 150, 0, 2 * Math.PI)
    }
    ctx.stroke()
    
    // Draw organelles
    organelles.forEach(organelle => {
      ctx.fillStyle = organelle.color
      ctx.beginPath()
      
      switch (organelle.type) {
        case 'nucleus':
          ctx.arc(organelle.x, organelle.y, organelle.size, 0, 2 * Math.PI)
          break
        case 'mitochondria':
          ctx.ellipse(organelle.x, organelle.y, organelle.size, organelle.size * 0.6, 0, 0, 2 * Math.PI)
          break
        case 'chloroplast':
          ctx.ellipse(organelle.x, organelle.y, organelle.size, organelle.size * 0.8, 0, 0, 2 * Math.PI)
          break
        default:
          ctx.arc(organelle.x, organelle.y, organelle.size, 0, 2 * Math.PI)
      }
      
      ctx.fill()
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // Add label
      ctx.fillStyle = '#333'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(organelle.name, organelle.x, organelle.y + organelle.size + 15)
    })
    
    // Add title
    ctx.fillStyle = '#333'
    ctx.font = '16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`${cellType.charAt(0).toUpperCase() + cellType.slice(1)} Cell`, 20, 30)
  }

  const drawGeometryShape = (ctx, data) => {
    const { shape, dimensions, showMeasurements } = data
    
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
    
    switch (shape) {
      case 'triangle':
        ctx.beginPath()
        ctx.moveTo(250, 100)
        ctx.lineTo(150, 300)
        ctx.lineTo(350, 300)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        
        if (showMeasurements) {
          ctx.fillStyle = '#333'
          ctx.font = '12px Arial'
          ctx.fillText(`${dimensions.base}`, 240, 320)
          ctx.fillText(`${dimensions.height}`, 120, 200)
        }
        break
        
      case 'circle':
        ctx.beginPath()
        ctx.arc(250, 200, dimensions.radius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Draw radius line
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(250, 200)
        ctx.lineTo(250 + dimensions.radius, 200)
        ctx.stroke()
        
        if (showMeasurements) {
          ctx.fillStyle = '#333'
          ctx.font = '12px Arial'
          ctx.fillText(`r = ${dimensions.radius}`, 260, 195)
        }
        break
        
      case 'rectangle':
        ctx.beginPath()
        ctx.rect(150, 150, dimensions.width, dimensions.height)
        ctx.fill()
        ctx.stroke()
        
        if (showMeasurements) {
          ctx.fillStyle = '#333'
          ctx.font = '12px Arial'
          ctx.fillText(`${dimensions.width}`, 220, 140)
          ctx.fillText(`${dimensions.height}`, 130, 220)
        }
        break
    }
  }

  const drawDataChart = (ctx, data) => {
    const { chartType, values, labels } = data
    
    if (chartType === 'bar') {
      const barWidth = 300 / values.length
      const maxValue = Math.max(...values)
      
      values.forEach((value, index) => {
        const barHeight = (value / maxValue) * 200
        const x = 100 + index * barWidth
        const y = 300 - barHeight
        
        ctx.fillStyle = `hsl(${index * 60}, 70%, 50%)`
        ctx.fillRect(x, y, barWidth - 10, barHeight)
        
        // Add value labels
        ctx.fillStyle = '#333'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(value, x + barWidth / 2, y - 5)
        ctx.fillText(labels[index], x + barWidth / 2, 320)
      })
    } else if (chartType === 'line') {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.beginPath()
      
      const stepX = 300 / (values.length - 1)
      const maxValue = Math.max(...values)
      
      values.forEach((value, index) => {
        const x = 100 + index * stepX
        const y = 300 - (value / maxValue) * 200
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        
        // Draw points
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      })
      
      ctx.stroke()
    }
    
    // Draw axes
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(100, 300)
    ctx.lineTo(400, 300)
    ctx.moveTo(100, 100)
    ctx.lineTo(100, 300)
    ctx.stroke()
  }

  const drawDefault = (ctx) => {
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, 500, 400)
    ctx.fillStyle = '#6b7280'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Visualization Loading...', 250, 200)
  }

  const evaluateEquation = (equation, x) => {
    try {
      // Simple equation evaluator (extend as needed)
      return eval(equation.replace(/x/g, x))
    } catch {
      return 0
    }
  }

  const toggleAnimation = () => {
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current)
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      animate()
    }
  }

  const animate = () => {
    setCurrentStep(prev => {
      const next = prev >= 100 ? 0 : prev + 1
      if (next < 100) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsPlaying(false)
      }
      return next
    })
  }

  const resetAnimation = () => {
    setCurrentStep(0)
    setIsPlaying(false)
    cancelAnimationFrame(animationRef.current)
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `visualization-${type}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Interactive Visualization
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={toggleAnimation}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={resetAnimation}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))}
            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={downloadImage}
            className="p-1 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          className="w-full h-auto bg-white"
        />
      </div>
      
      {isPlaying && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${currentStep}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1 text-center">
            Animation Progress: {currentStep}%
          </p>
        </div>
      )}
    </div>
  )
}

export default VisualizationEngine