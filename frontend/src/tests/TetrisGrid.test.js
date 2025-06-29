import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TetrisGrid from '@/components/TetrisGrid.vue'

// Mock constants
const mockConstants = {
  PIECE_COLORS: {
    0: '#2c3e50',
    1: '#e74c3c',
    2: '#f39c12',
    3: '#9b59b6',
    4: '#3498db',
    5: '#1abc9c',
    6: '#2ecc71',
    7: '#f1c40f'
  }
}

// Mock the constants module
vi.mock('@/constants', () => mockConstants)

describe('TetrisGrid', () => {
  let wrapper

  const createGrid = (rows = 20, cols = 10, fillValue = 0) => {
    return Array.from({ length: rows }, () => Array(cols).fill(fillValue))
  }

  const createPiece = () => ({
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    position: { x: 3, y: 0 },
    type: 1
  })

  beforeEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component rendering', () => {
    it('should render with default props', () => {
      const grid = createGrid()
      wrapper = mount(TetrisGrid, {
        props: {
          grid
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.tetris-grid').exists()).toBe(true)
    })

    it('should render grid cells', () => {
      const grid = createGrid(5, 5)
      wrapper = mount(TetrisGrid, {
        props: {
          grid
        }
      })

      const cells = wrapper.findAll('.cell')
      expect(cells).toHaveLength(25) // 5x5 grid
    })

    it('should apply correct cell classes for filled cells', () => {
      const grid = createGrid(2, 2, 0)
      grid[0][0] = 1 // Set one cell as filled
      grid[1][1] = 2 // Set another cell with different type

      wrapper = mount(TetrisGrid, {
        props: {
          grid
        }
      })

      const cells = wrapper.findAll('.cell')
      expect(cells[0].classes()).toContain('filled')
      expect(cells[0].classes()).toContain('type-1')
      expect(cells[3].classes()).toContain('filled')
      expect(cells[3].classes()).toContain('type-2')
    })

    it('should apply empty class for empty cells', () => {
      const grid = createGrid(2, 2, 0)
      
      wrapper = mount(TetrisGrid, {
        props: {
          grid
        }
      })

      const cells = wrapper.findAll('.cell')
      cells.forEach(cell => {
        expect(cell.classes()).toContain('empty')
      })
    })
  })

  describe('Current piece display', () => {
    it('should display current piece when provided', () => {
      const grid = createGrid()
      const currentPiece = createPiece()

      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          currentPiece
        }
      })

      // The component should render the piece on the grid
      expect(wrapper.vm.displayGrid).toBeDefined()
    })

    it('should compute display grid with falling piece', () => {
      const grid = createGrid(5, 5, 0)
      const currentPiece = {
        shape: [[1]],
        position: { x: 2, y: 1 },
        type: 3
      }

      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          currentPiece
        }
      })

      const displayGrid = wrapper.vm.displayGrid
      expect(displayGrid[1][2]).toBe(3) // Piece should be at position (2,1)
    })

    it('should handle piece outside grid bounds', () => {
      const grid = createGrid(3, 3, 0)
      const currentPiece = {
        shape: [[1]],
        position: { x: 5, y: 5 }, // Outside grid
        type: 1
      }

      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          currentPiece
        }
      })

      // Should not crash and return original grid
      expect(wrapper.vm.displayGrid).toEqual(grid)
    })
  })

  describe('Line clearing animations', () => {
    it('should apply clearing class when lines are being cleared', () => {
      const grid = createGrid()
      const clearedLinesInfo = {
        count: 2,
        rowIndices: [18, 19],
        timestamp: Date.now()
      }

      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          clearedLinesInfo
        }
      })

      // Find rows that should have clearing class
      const gridRows = wrapper.findAll('.grid-row')
      expect(gridRows[18].classes()).toContain('clearing')
      expect(gridRows[19].classes()).toContain('clearing')
    })

    it('should not apply clearing class to non-cleared rows', () => {
      const grid = createGrid()
      const clearedLinesInfo = {
        count: 1,
        rowIndices: [19],
        timestamp: Date.now()
      }

      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          clearedLinesInfo
        }
      })

      const gridRows = wrapper.findAll('.grid-row')
      expect(gridRows[18].classes()).not.toContain('clearing')
      expect(gridRows[19].classes()).toContain('clearing')
    })
  })

  describe('Player indication', () => {
    it('should apply current-player class when isCurrentPlayer is true', () => {
      const grid = createGrid()
      
      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          isCurrentPlayer: true
        }
      })

      expect(wrapper.find('.tetris-grid').classes()).toContain('current-player')
    })

    it('should not apply current-player class when isCurrentPlayer is false', () => {
      const grid = createGrid()
      
      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          isCurrentPlayer: false
        }
      })

      expect(wrapper.find('.tetris-grid').classes()).not.toContain('current-player')
    })
  })

  describe('Grid validation', () => {
    it('should handle empty grid prop', () => {
      wrapper = mount(TetrisGrid, {
        props: {
          grid: []
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.displayGrid).toEqual([])
    })

    it('should handle null grid prop', () => {
      wrapper = mount(TetrisGrid, {
        props: {
          grid: null
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.displayGrid).toEqual([])
    })

    it('should handle malformed current piece', () => {
      const grid = createGrid()
      const malformedPiece = {
        shape: null,
        position: null,
        type: 1
      }

      wrapper = mount(TetrisGrid, {
        props: {
          grid,
          currentPiece: malformedPiece
        }
      })

      expect(wrapper.vm.displayGrid).toEqual(grid)
    })
  })
})