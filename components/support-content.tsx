"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Phone,
  Mail,
  Clock,
  MessageCircle,
  FileText,
  CreditCard,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react"

const faqData = [
  {
    category: "Applications",
    icon: FileText,
    questions: [
      {
        q: "How long does it take to process my insurance application?",
        a: "Most applications are processed within 3-5 business days. Complex cases may take up to 10 business days.",
      },
      {
        q: "Can I edit my application after submission?",
        a: "You can make changes to pending applications. Once approved, you'll need to contact support for modifications.",
      },
    ],
  },
  {
    category: "Policies",
    icon: Shield,
    questions: [
      {
        q: "When does my coverage start?",
        a: "Coverage typically begins on the first day of the month following your application approval and first payment.",
      },
      {
        q: "How do I add family members to my policy?",
        a: "You can add family members through the Family section in your dashboard or contact our support team.",
      },
    ],
  },
  {
    category: "Payments",
    icon: CreditCard,
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept credit cards, debit cards, and bank transfers. Auto-pay is available for your convenience.",
      },
      {
        q: "What happens if I miss a payment?",
        a: "You have a 30-day grace period. We'll send reminders, and coverage continues during this time.",
      },
    ],
  },
]

export function SupportContent() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    category: "",
    message: "",
  })

  const handleFaqToggle = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Support form submitted:", contactForm)
    // Reset form
    setContactForm({ name: "", email: "", category: "", message: "" })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Center</h1>
        <p className="text-gray-600">Get help with your insurance applications, policies, and account</p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-orange-200 hover:border-orange-300 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Call Us</CardTitle>
            <CardDescription>Speak with our support team</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="font-semibold text-gray-900 mb-2">1-800-EPICARE</p>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Mon-Fri 8AM-8PM EST</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:border-orange-300 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Email Support</CardTitle>
            <CardDescription>Get help via email</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="font-semibold text-gray-900 mb-2">support@epicare.com</p>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Response within 24 hours</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:border-orange-300 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Live Chat</CardTitle>
            <CardDescription>Chat with an agent now</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white w-full">Start Chat</Button>
            <p className="text-sm text-gray-600 mt-2">Available 24/7</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqData.map((category) => (
              <Card key={category.category} className="border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <category.icon className="h-4 w-4 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.questions.map((faq, index) => {
                    const faqId = `${category.category}-${index}`
                    return (
                      <div key={faqId} className="border border-gray-100 rounded-lg">
                        <button
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                          onClick={() => handleFaqToggle(faqId)}
                        >
                          <span className="font-medium text-gray-900">{faq.q}</span>
                          {expandedFaq === faqId ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        {expandedFaq === faqId && (
                          <div className="px-4 pb-3 text-gray-600 border-t border-gray-100">
                            <p className="pt-3">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Support</h2>
          <Card>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>We'll get back to you within 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={contactForm.category}
                    onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="applications">Application Issues</option>
                    <option value="policies">Policy Questions</option>
                    <option value="payments">Payment & Billing</option>
                    <option value="family">Family Members</option>
                    <option value="technical">Technical Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Describe your issue or question in detail..."
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Insurance Guide</span>
                </div>
                <Button variant="outline" size="sm">
                  Download
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Family Coverage Info</span>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Payment Options</span>
                </div>
                <Button variant="outline" size="sm">
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
