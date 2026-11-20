// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('DevKit interface',()=>{
  it('renders brand, search and tool workspace',()=>{
    const {container}=render(<App />)
    expect(container.querySelector('.brand-name')).toHaveTextContent('devkit')
    expect(screen.getByLabelText(/search tools and categories/i)).toBeInTheDocument()
    expect(screen.getAllByText('JSON Formatter').length).toBeGreaterThan(0)
  })
})
