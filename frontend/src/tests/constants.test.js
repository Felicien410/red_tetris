import { describe, it, expect } from 'vitest'
import { PIECE_SHAPES, PIECE_COLORS } from '@/constants.js'

describe('Constants', () => {
  describe('PIECE_SHAPES', () => {
    it('should have all tetris piece types', () => {
      const expectedPieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
      
      expectedPieces.forEach(piece => {
        expect(PIECE_SHAPES).toHaveProperty(piece)
        expect(Array.isArray(PIECE_SHAPES[piece])).toBe(true)
      })
    })

    it('should have correct I piece shape', () => {
      const expectedIShape = [
        [1, 1, 1, 1]
      ]
      
      expect(PIECE_SHAPES.I).toEqual(expectedIShape)
    })

    it('should have correct O piece shape', () => {
      const expectedOShape = [
        [1, 1],
        [1, 1]
      ]
      
      expect(PIECE_SHAPES.O).toEqual(expectedOShape)
    })

    it('should have correct T piece shape', () => {
      const expectedTShape = [
        [0, 1, 0],
        [1, 1, 1]
      ]
      
      expect(PIECE_SHAPES.T).toEqual(expectedTShape)
    })

    it('should have correct S piece shape', () => {
      const expectedSShape = [
        [0, 1, 1],
        [1, 1, 0]
      ]
      
      expect(PIECE_SHAPES.S).toEqual(expectedSShape)
    })

    it('should have correct Z piece shape', () => {
      const expectedZShape = [
        [1, 1, 0],
        [0, 1, 1]
      ]
      
      expect(PIECE_SHAPES.Z).toEqual(expectedZShape)
    })

    it('should have correct J piece shape', () => {
      const expectedJShape = [
        [1, 0, 0],
        [1, 1, 1]
      ]
      
      expect(PIECE_SHAPES.J).toEqual(expectedJShape)
    })

    it('should have correct L piece shape', () => {
      const expectedLShape = [
        [0, 0, 1],
        [1, 1, 1]
      ]
      
      expect(PIECE_SHAPES.L).toEqual(expectedLShape)
    })

    it('should have valid shape structures', () => {
      Object.values(PIECE_SHAPES).forEach(shape => {
        expect(Array.isArray(shape)).toBe(true)
        expect(shape.length).toBeGreaterThan(0)
        
        shape.forEach(row => {
          expect(Array.isArray(row)).toBe(true)
          expect(row.length).toBeGreaterThan(0)
          
          row.forEach(cell => {
            expect(typeof cell).toBe('number')
            expect([0, 1]).toContain(cell)
          })
        })
      })
    })
  })

  describe('PIECE_COLORS', () => {
    it('should have color mappings for all piece types', () => {
      const pieceTypes = Object.keys(PIECE_SHAPES)
      
      pieceTypes.forEach(type => {
        expect(PIECE_COLORS).toHaveProperty(type)
        expect(typeof PIECE_COLORS[type]).toBe('string')
        expect(PIECE_COLORS[type]).toMatch(/^#[0-9a-fA-F]{6}$/) // Valid hex color
      })
    })

    it('should have colors for all piece types', () => {
      const pieceTypes = Object.keys(PIECE_SHAPES)
      
      pieceTypes.forEach(type => {
        expect(PIECE_COLORS).toHaveProperty(type)
        expect(typeof PIECE_COLORS[type]).toBe('string')
        expect(PIECE_COLORS[type]).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('should have unique colors for different pieces', () => {
      const colors = Object.values(PIECE_COLORS)
      const uniqueColors = [...new Set(colors)]
      
      expect(uniqueColors.length).toBe(colors.length)
    })

    it('should have specific color mappings', () => {
      // Test actual color mappings from constants.js
      expect(PIECE_COLORS.I).toBe('#00f0f0') // Cyan
      expect(PIECE_COLORS.O).toBe('#f0f000') // Yellow
      expect(PIECE_COLORS.T).toBe('#a000f0') // Purple
      expect(PIECE_COLORS.S).toBe('#00f000') // Green
      expect(PIECE_COLORS.Z).toBe('#f00000') // Red
      expect(PIECE_COLORS.J).toBe('#0000f0') // Blue
      expect(PIECE_COLORS.L).toBe('#f0a000') // Orange
    })
  })

  describe('Shape consistency', () => {
    it('should have consistent piece numbering', () => {
      const pieceTypes = Object.keys(PIECE_SHAPES)
      
      pieceTypes.forEach(type => {
        const shape = PIECE_SHAPES[type]
        let hasFilledCell = false
        
        shape.forEach(row => {
          row.forEach(cell => {
            if (cell === 1) {
              hasFilledCell = true
            }
          })
        })
        
        expect(hasFilledCell).toBe(true) // Each piece should have at least one filled cell
      })
    })

    it('should have rectangular grids', () => {
      Object.values(PIECE_SHAPES).forEach(shape => {
        const firstRowLength = shape[0].length
        
        shape.forEach(row => {
          expect(row.length).toBe(firstRowLength)
        })
      })
    })
  })
})