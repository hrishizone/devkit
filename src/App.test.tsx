// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('DevKit interface',()=>{
  it('renders brand, search and tool workspace',()=>{
    const {container}=render(<App />)
    expect(container.querySelector('.brand-name')).toHaveTextContent('devkit')
    expect(screen.getByLabelText(/search tools and categories/i)).toBeInTheDocument()
    expect(screen.getAllByText('JSON Formatter').length).toBeGreaterThan(0)
  })
})

it('exposes JSON Pointer input and executes the selected path',async()=>{
  const user=userEvent.setup()
  const {container}=render(<App />)
  await user.type(screen.getByLabelText(/search tools and categories/i),'JSON Pointer')
  await user.click(screen.getByText('JSON Pointer Tester'))
  await user.type(screen.getByLabelText('JSON Pointer'),'/user/name')
  await user.click(screen.getByRole('button',{name:/run tool/i}))
  await waitFor(()=>expect(container.querySelector('pre')).toHaveTextContent('"Ava"'))
})

it('loads a safe default regex pattern and excludes disabled SHA-1 hashing',async()=>{
  const user=userEvent.setup()
  const {container}=render(<App />)
  await user.clear(screen.getByLabelText(/search tools and categories/i))
  await user.type(screen.getByLabelText(/search tools and categories/i),'Regex Tester')
  await user.click(screen.getByText('Regex Tester'))
  expect(screen.getByDisplayValue('[A-Z][a-z]+')).toBeInTheDocument()
  await user.clear(screen.getByLabelText(/search tools and categories/i))
  await user.type(screen.getByLabelText(/search tools and categories/i),'Hash Generator')
  await user.click(screen.getByText('Hash Generator'))
  expect(container.querySelector('select')?.textContent).not.toContain('SHA-1')
  expect(container.querySelector('select')?.textContent).toContain('SHA-384')
})

it('requires a visible secret field for HMAC tools',async()=>{
  const user=userEvent.setup()
  render(<App />)
  await user.type(screen.getByLabelText(/search tools and categories/i),'HMAC SHA-256')
  await user.click(screen.getByText('HMAC SHA-256'))
  expect(screen.getByLabelText('HMAC secret')).toHaveAttribute('type','password')
})
