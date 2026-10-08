// The Terms of Service. PLACEHOLDER: a plain-language draft for Fonts &
// Footers; have a lawyer review it before it goes live, and confirm the
// entity name, the prices, and what happens to a site on cancellation.

import type { LegalDocData } from "./types";

export const terms: LegalDocData = {
  eyebrow: "Terms of service",
  title: "Terms of service",
  updated: "October 8, 2026",
  sections: [
    {
      id: "agreement",
      title: "Agreement",
      blocks: [
        {
          type: "p",
          text: 'These terms are an agreement between you and Fonts & Footers ("Fonts & Footers," "we," "our," or "us") covering your use of fontsandfooters.com (the "Site") and our services: custom websites, the Full Platform booking and dispatch software, the leads tool and the free website audit (together, the "Services"). By using the Site or signing up for a Service you agree to these terms. If you are signing up for a company, you confirm you can bind that company.',
        },
      ],
    },
    {
      id: "the-services",
      title: "The services",
      blocks: [
        {
          type: "p",
          text: "We offer the following, as described on the Site at the time you sign up:",
        },
        {
          type: "list",
          items: [
            "Website Only: a custom website with an SEO foundation, hosting and edits, for a monthly fee plus a one-time setup fee.",
            "Full Platform: a custom website with the booking, dispatch, driver and admin software built in, and the leads tool included, for a monthly fee plus a one-time setup fee.",
            "Leads tool: a monthly subscription to the leads tool on its own, with a free trial period.",
            "Free website audit: an automated report on a website you submit, provided as is and for information only.",
          ],
        },
        {
          type: "p",
          text: "We may change or improve the Services over time. If a change materially reduces what your plan includes, we will tell you before it takes effect.",
        },
      ],
    },
    {
      id: "accounts",
      title: "Accounts",
      blocks: [
        {
          type: "p",
          text: "You are responsible for the accounts we create for you and your team, including keeping passwords private and for everything done under them. Tell us right away if you think an account has been used without permission. You must give us accurate information and keep it up to date, because we use it to run your site and bill you.",
        },
      ],
    },
    {
      id: "fees-and-billing",
      title: "Fees and billing",
      blocks: [
        {
          type: "p",
          text: "Plans are billed monthly in advance at the price shown on the Site when you sign up, plus any one-time setup fee. We do not charge per-booking fees. Payments through your booking system go to your own Stripe account, and Stripe's processing fees are between you and Stripe.",
        },
        {
          type: "list",
          items: [
            "Your subscription renews each month until you cancel.",
            "Setup fees are due before work starts and are not refundable once work has begun.",
            "Monthly fees are not refunded for a partial month.",
            "If a payment fails, we will let you know and may pause the Service until it is paid.",
            "We may change prices with at least 30 days' notice; the new price applies from your next renewal after the notice.",
          ],
        },
      ],
    },
    {
      id: "cancellation",
      title: "Cancellation",
      blocks: [
        {
          type: "p",
          text: "There is no long-term contract. You can cancel any plan at any time by emailing us, and the cancellation takes effect at the end of the current billing month. On request we will give you an export of your customer list, bookings and content in a standard format.",
        },
        {
          type: "p",
          text: "Your domain name stays yours. The website, the booking software and the hosting are part of the subscription, so when it ends the site and software stop running; we can help you move your content and data to a new provider.",
        },
      ],
    },
    {
      id: "your-content-and-data",
      title: "Your content and data",
      blocks: [
        {
          type: "p",
          text: "Everything you give us to build and run your site belongs to you: your name, logo, photos, text, prices, customer list, bookings and payment records. You give us permission to use it to provide the Services. We will not sell your data or use your customer list for anything other than running your software.",
        },
        {
          type: "p",
          text: "You confirm you have the right to use the content you give us, including photos and reviews, and that it does not infringe anyone else's rights.",
        },
      ],
    },
    {
      id: "our-platform",
      title: "Our platform",
      blocks: [
        {
          type: "p",
          text: "The software, designs, code, templates and tools we use to build and run the Services are ours or our licensors', and stay ours. You get a license to use them as part of your subscription, and only for your own business. You may not copy, resell, reverse engineer or build a competing product from them.",
        },
        {
          type: "p",
          text: "We may show your site in our portfolio and name you as a client unless you ask us not to.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      blocks: [
        { type: "p", text: "You agree not to use the Services to:" },
        {
          type: "list",
          items: [
            "Break the law, including transportation, consumer-protection and anti-spam laws in the places you operate.",
            "Send unsolicited messages in bulk, or contact people found through the leads tool in ways the law does not allow.",
            "Upload anything that is misleading, infringing, harmful or offensive.",
            "Interfere with the Services, test their security without permission, or access data that is not yours.",
          ],
        },
        {
          type: "p",
          text: "We may suspend or end a Service that is used in these ways.",
        },
      ],
    },
    {
      id: "third-party-services",
      title: "Third-party services",
      blocks: [
        {
          type: "p",
          text: "The Services rely on third parties such as Stripe for payments, flight-data providers, hosting, email delivery and maps. Their terms apply to your use of them, and we are not responsible for their availability or actions. The free audit and the leads tool use public data that may be incomplete or out of date; check it before you rely on it.",
        },
      ],
    },
    {
      id: "disclaimers-and-liability",
      title: "Disclaimers and liability",
      blocks: [
        {
          type: "p",
          text: 'We work hard to keep the Services accurate and available, but they are provided "as is" and we do not promise they will be error-free or uninterrupted, or that they will produce any particular search ranking, number of visits, leads or bookings. To the fullest extent the law allows, our total liability for any claim connected to the Services is limited to the fees you paid us in the 12 months before the claim, and we are not liable for indirect, incidental or consequential losses such as lost profits or lost bookings.',
        },
      ],
    },
    {
      id: "changes-to-these-terms",
      title: "Changes to these terms",
      blocks: [
        {
          type: "p",
          text: "We may update these terms from time to time. We will change the date at the top of this page, and for significant changes we will email clients before they take effect. Continuing to use the Services after a change means you accept the updated terms.",
        },
      ],
    },
    {
      id: "governing-law-and-contact",
      title: "Governing law and contact",
      blocks: [
        {
          type: "p",
          text: "These terms are governed by the laws of the State of Arizona, and any dispute will be handled in the state or federal courts located in Maricopa County, Arizona. Questions about these terms: email hello@fontsandfooters.com. Fonts & Footers is based in Phoenix, Arizona.",
        },
      ],
    },
  ],
};
