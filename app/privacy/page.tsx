import type { Metadata } from 'next'
import { LegalPage, Section, Sub, List, Notice, Fill } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy · Spark',
  description: 'What data Spark collects, why, how long we keep it, and your rights over it.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="What we collect, why we collect it, how long we keep it, and what you can make us do with it."
      lastUpdated="4 September 2026"
    >
      <Notice tone="critical">
        <p>
          A dating profile reveals unusually sensitive things about you — who you are attracted to,
          where you are, what you look like, and what you say in private. Please read section 2
          carefully before you fill in your profile. Anything you put in your profile is visible to
          other users of Spark.
        </p>
      </Notice>

      <Section id="who" number={1} title="Who we are">
        <p>
          <Fill>[LEGAL ENTITY NAME]</Fill>, <Fill>[registered address]</Fill> (&ldquo;Spark&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;) is the <strong>Data Fiduciary</strong> for the
          personal data described in this policy — the equivalent of a &ldquo;data
          controller&rdquo; under the GDPR. This policy explains how we handle your data under
          India&rsquo;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;), and,
          where they apply to you, the EU/UK GDPR and the California Consumer Privacy Act.
        </p>
      </Section>

      <Section id="collect" number={2} title="What we collect">
        <Sub title="Data you give us">
          <List
            items={[
              <>
                <strong>Account data:</strong> your email address and a securely hashed password (or
                your chosen sign-in provider).
              </>,
              <>
                <strong>Profile data:</strong> your name, age, gender, who you are interested in,
                bio, location as you type it, occupation, interests, and any Instagram or Spotify
                links you add.
              </>,
              <>
                <strong>Photographs</strong> you upload.
              </>,
              <>
                <strong>Messages</strong> you send to your matches, and the reports you file about
                other users.
              </>,
            ]}
          />
          <Notice>
            <p>
              <strong>Some of this is legally &ldquo;sensitive&rdquo;.</strong> Your gender, who you
              are interested in, and your photographs can reveal your sexual orientation, and in
              some jurisdictions your race or religion. Under the GDPR this is special-category
              data. We process it <strong>only because you actively chose to provide it</strong> in
              order to use a dating service, and you can withdraw that by deleting your account.
              Please do not put information in your bio — health conditions, immigration status,
              political or religious affiliation, caste — that you would not want other users to
              see.
            </p>
          </Notice>
        </Sub>
        <Sub title="Data we generate">
          <List
            items={[
              'Your swipes, matches, follows and friend requests.',
              'Blocks you have applied and reports you have filed.',
              'Metadata about calls you place through the app — who called whom, when, and for how long.',
              'Basic technical logs: IP address, device and browser type, and timestamps, kept for security and abuse prevention.',
            ]}
          />
          <p>
            We do <strong>not</strong> collect precise GPS location. The
            &ldquo;location&rdquo; on your profile is free text that you type and can change or
            leave blank.
          </p>
          <p>
            Video and voice calls are carried by our calling provider and are{' '}
            <strong>not recorded or stored by us</strong>.
          </p>
        </Sub>
      </Section>

      <Section id="why" number={3} title="Why we use it, and our legal basis">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                <th className="text-left py-2 font-semibold">Basis</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr>td]:py-2 [&>tr>td]:pr-4 [&>tr>td]:align-top">
              <tr>
                <td>Create your account and show your profile to other users</td>
                <td>Performance of a contract / your consent</td>
              </tr>
              <tr>
                <td>Suggest profiles and create matches</td>
                <td>Performance of a contract</td>
              </tr>
              <tr>
                <td>Deliver messages and calls between matches</td>
                <td>Performance of a contract</td>
              </tr>
              <tr>
                <td>Investigate reports, enforce our Terms, detect fraud and abuse</td>
                <td>Legitimate interests — keeping users safe</td>
              </tr>
              <tr>
                <td>Keep the Service secure and debug faults</td>
                <td>Legitimate interests</td>
              </tr>
              <tr>
                <td>Respond to lawful requests from courts and law enforcement</td>
                <td>Legal obligation</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We do <strong>not</strong> sell your personal data, and we do not share it with
          advertisers or data brokers.
        </p>
      </Section>

      <Section id="visible" number={4} title="What other users can see">
        <p>
          Your name, age, gender, who you are interested in, bio, typed location, occupation,
          interests, photographs and any social links are visible to other users in discovery and on
          your profile.
        </p>
        <p>
          Your <strong>email address is never shown to other users</strong>, and our database
          enforces that at the column level rather than relying on the app to hide it.
        </p>
        <p>
          Your swipes are private — nobody is told that you passed on them. A match is created only
          when two people like each other.
        </p>
        <p>
          Reports you file are <strong>not</strong> disclosed to the person you reported.
        </p>
      </Section>

      <Section id="share" number={5} title="Who we share it with">
        <p>
          We use a small number of processors who handle data on our instructions and are bound by
          contract:
        </p>
        <List
          items={[
            <>
              <strong>Supabase</strong> — database, authentication and file storage.
            </>,
            <>
              <strong>LiveKit</strong> — real-time video and voice calling.
            </>,
            <>
              <strong><Fill>[Vercel / your host]</Fill></strong> — application hosting.
            </>,
          ]}
        />
        <p>
          We may also disclose data where we are legally required to, where it is necessary to
          investigate a violation of our Terms, or to protect the rights or safety of any person.
        </p>
        <Sub title="International transfers">
          <p>
            Our providers may store or process data outside India, including in the{' '}
            <Fill>[region — e.g. European Union / United States]</Fill>. Where that happens we rely
            on the provider&rsquo;s standard contractual clauses and equivalent safeguards. You can
            ask us for details.
          </p>
        </Sub>
      </Section>

      <Section id="retention" number={6} title="How long we keep it">
        <List
          items={[
            <>
              <strong>While your account is active:</strong> for as long as you keep it.
            </>,
            <>
              <strong>After you delete your account:</strong> your profile, photographs and swipes
              are deleted within <Fill>[30 days]</Fill>.
            </>,
            <>
              <strong>Messages:</strong> a copy remains visible to the person you sent it to, in the
              same way an email you have sent stays in the recipient&rsquo;s inbox.
            </>,
            <>
              <strong>Reports, blocks and safety records:</strong> retained for up to{' '}
              <Fill>[3 years]</Fill> so that a banned user cannot simply return, and so we can
              respond to law-enforcement requests.
            </>,
            <>
              <strong>Records we must keep by law,</strong> including under the Information
              Technology Act, 2000 and rules made under it, for the period the law requires.
            </>,
          ]}
        />
      </Section>

      <Section id="rights" number={7} title="Your rights">
        <p>Depending on where you live, you can ask us to:</p>
        <List
          items={[
            'Give you a copy of the personal data we hold about you, and tell you who we have shared it with.',
            'Correct data that is inaccurate, incomplete or out of date.',
            'Erase your data, and delete your account.',
            'Restrict or object to certain processing, including processing based on our legitimate interests.',
            'Withdraw a consent you previously gave, at any time — this does not affect processing already carried out.',
            'Nominate another person to exercise these rights on your behalf if you die or become incapacitated (DPDP Act, section 14).',
          ]}
        />
        <p>
          To exercise any of these, email <Fill>[privacy@yourdomain]</Fill>. We will respond within{' '}
          <Fill>[30 days]</Fill>. We may need to verify your identity first.
        </p>
        <p>
          If you are unhappy with our response you may complain to the{' '}
          <strong>Data Protection Board of India</strong>, or, if you are in the EU/UK, to your
          local supervisory authority.
        </p>
        <Sub title="California residents">
          <p>
            We do not sell or share personal information as those terms are defined by the CCPA, and
            we have not done so in the preceding twelve months. You have the right to know, delete
            and correct, and not to be discriminated against for exercising those rights.
          </p>
        </Sub>
      </Section>

      <Section id="security" number={8} title="How we protect it">
        <p>
          Data is encrypted in transit. Access to the database is governed by row-level security
          policies, so one user&rsquo;s account cannot read another&rsquo;s messages, swipes or
          email address even through a hand-crafted request. Passwords are hashed by our
          authentication provider and are never visible to us. Blocks are enforced at the database
          layer rather than in the interface.
        </p>
        <p>
          No system is perfectly secure. If a breach occurs that is likely to affect you, we will
          notify you and the Data Protection Board of India as the DPDP Act requires.
        </p>
      </Section>

      <Section id="children" number={9} title="Children">
        <p>
          Spark is for adults aged 18 and over. We do not knowingly collect data from anyone under
          18. If we learn that we have, we delete the account and its data. If you believe a child
          is using Spark, report the profile in the app choosing{' '}
          <strong>&ldquo;Underage&rdquo;</strong>, or email <Fill>[safety@yourdomain]</Fill>{' '}
          immediately.
        </p>
      </Section>

      <Section id="changes" number={10} title="Changes and contact">
        <p>
          We will post any change here and update the date at the top. If a change materially
          affects your rights we will notify you in the app or by email before it takes effect.
        </p>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p>
            <strong>Data Protection / Grievance Officer:</strong> <Fill>[FULL NAME]</Fill>
          </p>
          <p>
            <strong>Email:</strong> <Fill>[privacy@yourdomain]</Fill>
          </p>
          <p>
            <strong>Address:</strong> <Fill>[full postal address in India]</Fill>
          </p>
        </div>
      </Section>
    </LegalPage>
  )
}
