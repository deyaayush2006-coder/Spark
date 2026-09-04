import type { Metadata } from 'next'
import { LegalPage, Section, Sub, List, Notice, Fill } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Terms & Conditions · Spark',
  description: 'The rules for using Spark, and the limits of our responsibility.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle="The rules for using Spark, and the limits of what we are responsible for."
      lastUpdated="4 September 2026"
    >
      <Notice tone="critical">
        <p className="font-semibold mb-2">Read sections 5, 6 and 8 before you sign up.</p>
        <p>
          Spark connects people. It does <strong>not</strong> verify who they are, and it cannot
          keep you safe when you meet someone offline. Sections 5 (No Verification), 6 (Limitation
          of Liability) and 8 (Offline Meetings) limit our legal responsibility for what other
          users do. If you do not accept those limits, do not use Spark.
        </p>
      </Notice>

      <Section id="acceptance" number={1} title="Acceptance of these Terms">
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) are a binding agreement between you and{' '}
          <Fill>[LEGAL ENTITY NAME]</Fill>, <Fill>[registered address]</Fill> (&ldquo;Spark&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;), the operator of the Spark application and website
          (the &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account, ticking the agreement box at sign-up, or using the Service in any
          way, you confirm that you have read, understood and agree to be bound by these Terms and
          by our{' '}
          <a href="/privacy" className="text-primary hover:underline underline-offset-2">
            Privacy Policy
          </a>
          . If you do not agree, you must not use the Service.
        </p>
        <p>
          We may update these Terms. If a change materially affects your rights, we will give you
          notice in the app or by email before it takes effect, and continuing to use the Service
          after that date means you accept the updated Terms. The &ldquo;last updated&rdquo; date at
          the top of this page always reflects the current version.
        </p>
      </Section>

      <Section id="eligibility" number={2} title="Age and eligibility">
        <Notice tone="critical">
          <p>
            <strong>Spark is strictly for adults aged 18 and over.</strong> There are no exceptions,
            including where the local age of majority is lower.
          </p>
        </Notice>
        <p>By creating an account you represent and warrant that:</p>
        <List
          items={[
            'You are at least 18 years old on the date you register.',
            'You have the legal capacity to enter into a binding contract.',
            'You have never been convicted of, or are subject to any court order relating to, a felony, a sexual offence, an offence against a child, violence, stalking, harassment or fraud.',
            'You are not required to register as a sex offender with any government body.',
            'You are not barred from using the Service under the laws of your country, and you are not on any applicable sanctions list.',
            'You have not previously had a Spark account removed by us for breach of these Terms.',
          ]}
        />
        <Sub title="How we check age">
          <p>
            We currently rely on <strong>self-declaration</strong>. You enter your date of age at
            sign-up, our systems reject any age below 18, and by proceeding you formally attest to
            being 18 or older. We do <strong>not</strong> presently perform documentary or
            biometric age verification, and you should not assume that any other user&rsquo;s stated
            age has been checked by us.
          </p>
          <p>
            Providing a false age is a material breach of these Terms and may also be a criminal
            offence. We will terminate any account we believe belongs to a minor, without notice or
            refund.
          </p>
        </Sub>
        <Sub title="Reporting a suspected minor">
          <p>
            If you believe a user is under 18, report them immediately using the{' '}
            <strong>Report</strong> option in the app and select{' '}
            <strong>&ldquo;Underage&rdquo;</strong>, or email <Fill>[safety@yourdomain]</Fill>. We
            treat these reports as the highest priority and will suspend the reported account
            pending review. Content involving the sexual exploitation of a child is reported to law
            enforcement and to the National Cyber Crime Reporting Portal, and we cooperate fully
            with any resulting investigation.
          </p>
        </Sub>
      </Section>

      <Section id="conduct" number={3} title="User conduct and acceptable use">
        <p>
          You are responsible for everything you do on Spark and everything you post. The following
          is a non-exhaustive list of what is prohibited. You must not:
        </p>

        <Sub title="Harm to other people">
          <List
            items={[
              'Harass, bully, threaten, intimidate, stalk or defame any person, on or off the Service.',
              'Send sexually explicit content to anyone who has not asked for it, including unsolicited nude or sexual images.',
              'Promote, incite or glorify violence, self-harm, suicide, terrorism or any criminal act.',
              'Post hate speech, or attack or demean anyone on the basis of religion, caste, race, ethnicity, national origin, sex, gender, gender identity, sexual orientation, disability or serious disease.',
              'Share, threaten to share, or solicit intimate images or private information about another person without their consent (including doxxing and so-called "revenge porn").',
              'Contact a user who has blocked you, or evade a block or ban by creating a new account.',
            ]}
          />
        </Sub>

        <Sub title="Deception and fraud">
          <List
            items={[
              'Impersonate any person or organisation, or misrepresent your age, identity, photographs or affiliation.',
              'Use photographs of another person, or images you do not have the right to use.',
              'Operate a fake, automated or bulk-registered account, or use bots, scrapers or automated scripts against the Service.',
              'Run any scam, confidence trick, phishing attempt or investment, cryptocurrency or "task" fraud.',
              'Solicit money, gifts, bank details, one-time passwords, UPI transfers, cryptocurrency or financial assistance from other users, for any reason.',
            ]}
          />
          <Notice>
            <p>
              <strong>Never send money to someone you met on Spark.</strong> Romance fraud is the
              single most common form of harm on dating platforms. No genuine match will need an
              emergency transfer, a customs fee, a medical payment or help with an investment. We
              will never ask for your password or an OTP.
            </p>
          </Notice>
        </Sub>

        <Sub title="Illegal and commercial use">
          <List
            items={[
              'Advertise, promote or solicit commercial sexual services, escorting or prostitution.',
              'Engage in human trafficking or any form of exploitation.',
              'Buy, sell or advertise drugs, weapons, counterfeit goods or other illegal items.',
              'Use the Service to advertise a business, recruit, canvass, spam or conduct market research without our written permission.',
              'Post content that is unlawful under Indian law, including the Information Technology Act, 2000, the Bharatiya Nyaya Sanhita, 2023, and rules made under them.',
            ]}
          />
        </Sub>

        <Sub title="Interference with the Service">
          <List
            items={[
              'Attempt to gain unauthorised access to any account, server or database, or probe, scan or test the security of the Service.',
              'Reverse engineer, decompile or copy any part of the Service except where that right cannot lawfully be excluded.',
              'Introduce malware, or overload, disrupt or interfere with the Service or other users’ enjoyment of it.',
              'Collect or harvest other users’ data, including by scraping profiles or exporting message content.',
            ]}
          />
        </Sub>

        <Notice tone="critical">
          <p>
            <strong>Consequences.</strong> Breaching this section may result in{' '}
            <strong>immediate suspension or permanent termination of your account, without notice,
            without explanation and without any refund</strong> of amounts paid. Where conduct
            appears criminal, we may report it to the police and preserve and disclose relevant
            data to them.
          </p>
        </Notice>
      </Section>

      <Section id="content" number={4} title="Your content and our licence">
        <p>
          You keep ownership of the photographs, text and other material you upload (&ldquo;Your
          Content&rdquo;). You grant us a worldwide, non-exclusive, royalty-free licence to host,
          store, reproduce, adapt (for example, to resize an image) and display Your Content solely
          for the purpose of operating, securing and improving the Service. This licence ends when
          you delete the content or your account, except where we must retain a copy to comply with
          law, resolve a dispute or enforce these Terms.
        </p>
        <p>You warrant that you own or have the rights to Your Content, and that it does not infringe anyone else&rsquo;s rights.</p>
        <Sub title="Intellectual property complaints">
          <p>
            If you believe content on Spark infringes your copyright or trade mark, send a notice to{' '}
            <Fill>[legal@yourdomain]</Fill> identifying the work, the location of the infringing
            content, your contact details, and a statement that you have a good-faith belief the use
            is unauthorised and that your notice is accurate. We will remove or disable access to
            infringing material and may terminate the accounts of repeat infringers.
          </p>
        </Sub>
      </Section>

      <Section id="no-verification" number={5} title="No verification, no screening, no guarantee">
        <Notice tone="critical">
          <p className="font-semibold mb-2">This is the most important section of these Terms.</p>
          <p>
            We are a platform that helps people find each other. We are{' '}
            <strong>not</strong> a matchmaking service, an introduction agency, a background-check
            provider or a guarantor of anyone&rsquo;s safety, honesty or intentions.
          </p>
        </Notice>
        <p>You expressly acknowledge and agree that:</p>
        <List
          items={[
            <>
              <strong>We do not conduct criminal background checks</strong> on users, and we do not
              screen users against sex-offender registries, sanctions lists or any other database.
            </>,
            <>
              <strong>We do not verify identity.</strong> We do not check names, photographs, ages,
              occupations, locations or any other information a user chooses to enter. Any badge,
              tick or label in the app is not a representation by us that a person is who they claim
              to be.
            </>,
            <>
              <strong>We do not vet photographs before they appear.</strong> Images are published
              when uploaded and are reviewed only after they are reported.
            </>,
            <>
              <strong>Profile information is user-supplied and may be false.</strong> Anything you
              read on Spark, including age, marital status, health status and photographs, may be
              inaccurate or deliberately deceptive.
            </>,
            <>
              <strong>A match is not an endorsement.</strong> Being shown a profile, or matching
              with someone, is the output of software. It is not a recommendation, a vouching, or a
              statement that the person is safe to meet.
            </>,
            <>
              <strong>Some profiles are operated by us.</strong> The Service includes demonstration
              profiles that are labelled in the app and that generate automated replies. They are
              not real people, they cannot meet you, and you should not treat them as genuine
              matches.
            </>,
          ]}
        />
        <p className="font-semibold">
          You are solely responsible for deciding who to talk to, what to share, and whether to
          meet. Use the Service at your own risk.
        </p>
      </Section>

      <Section id="liability" number={6} title="Disclaimers and limitation of liability">
        <Sub title="The Service is provided as-is">
          <p>
            To the maximum extent permitted by law, the Service is provided{' '}
            <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>, without warranty of
            any kind, whether express, implied or statutory, including any implied warranty of
            merchantability, fitness for a particular purpose, accuracy or non-infringement. We do
            not warrant that the Service will be uninterrupted, secure or error-free, that defects
            will be corrected, or that you will find a match, a relationship or any particular
            outcome.
          </p>
        </Sub>

        <Sub title="What we are not liable for">
          <p>
            To the maximum extent permitted by law, <Fill>[LEGAL ENTITY NAME]</Fill>, its
            directors, employees, contractors and agents will <strong>not</strong> be liable for:
          </p>
          <List
            items={[
              'The conduct of any user, whether online or offline, including harassment, abuse, assault, stalking, defamation, discrimination, deception or any criminal act.',
              'Any injury, illness, sexually transmitted infection, emotional or psychological harm, distress, humiliation, or death arising from contact with another user.',
              'Any financial loss, including loss caused by romance fraud, investment scams, extortion, sextortion or blackmail.',
              'The accuracy, legality or decency of any content posted by users.',
              'Any decision you make on the basis of information you found on the Service.',
              'Loss of data, loss of profits, loss of goodwill, or business interruption.',
              'Any failure or interruption caused by third-party services we depend on, including hosting, database, authentication and video-calling providers.',
              'Any indirect, incidental, special, punitive or consequential damages of any kind, however caused and on any theory of liability, even if we have been advised of the possibility of such damages.',
            ]}
          />
        </Sub>

        <Sub title="Cap on liability">
          <p>
            To the maximum extent permitted by law, our total aggregate liability to you for all
            claims arising out of or relating to the Service or these Terms will not exceed the
            greater of (a) the total amount you paid us in the twelve (12) months immediately before
            the event giving rise to the claim, or (b) <Fill>[INR 1,000]</Fill>.
          </p>
        </Sub>

        <Notice>
          <p>
            <strong>What these limits cannot do.</strong> Nothing in these Terms excludes or limits
            our liability for death or personal injury caused by our own negligence, for fraud or
            fraudulent misrepresentation, for gross negligence or wilful misconduct, or for any
            other liability that cannot lawfully be excluded or limited. If a court finds any part
            of this section unenforceable, the rest continues to apply, and our liability is limited
            to the smallest amount the law allows.
          </p>
        </Notice>
      </Section>

      <Section id="indemnity" number={7} title="Indemnity">
        <p>
          You agree to indemnify, defend and hold harmless <Fill>[LEGAL ENTITY NAME]</Fill> and its
          directors, employees, contractors and agents from and against any claim, demand, action,
          proceeding, loss, liability, damage, fine, penalty, and reasonable legal and professional
          costs, arising out of or connected with:
        </p>
        <List
          items={[
            'Your use or misuse of the Service.',
            'Your breach of these Terms or of any applicable law.',
            'Content you posted, sent or shared.',
            'Your interaction with any other user, whether online or in person.',
            'Your infringement of any third party’s rights, including privacy and intellectual property rights.',
          ]}
        />
        <p>
          We may, at our own expense, assume the exclusive defence and control of any matter subject
          to this indemnity, and you agree to cooperate with us. You may not settle any such matter
          in a way that imposes an obligation on us without our prior written consent.
        </p>
      </Section>

      <Section id="offline" number={8} title="Offline meetings and your own decisions">
        <Notice tone="critical">
          <p>
            Every decision to move a conversation off Spark, to share personal information, to send
            money, or to meet someone in person is{' '}
            <strong>entirely your own decision and entirely your own risk</strong>. We are not a
            party to it, we do not supervise it, and we accept no responsibility for what happens.
          </p>
        </Notice>
        <p>Before meeting anyone from Spark, we strongly recommend that you:</p>
        <List
          items={[
            'Video-call the person first, and be wary of anyone who refuses.',
            'Meet in a public, well-populated place, in daylight, for the first several meetings.',
            'Tell a friend or family member where you are going, who you are meeting, and when you expect to be back. Share your live location with them.',
            'Arrange your own transport, both ways, and keep control of it.',
            'Never leave your drink or belongings unattended.',
            'Never send money, share banking details, one-time passwords, or intimate images — no matter how compelling the story.',
            'Search the person’s name and reverse-search their photos before you meet.',
            'Trust your instincts. Leave at any point, for any reason, without explaining yourself.',
          ]}
        />
        <p>
          If you are in immediate danger, contact the police on <strong>112</strong>. In India you
          can also call the Women&rsquo;s Helpline on <strong>1091</strong>, the Cyber Crime
          Helpline on <strong>1930</strong>, or report online at{' '}
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-2"
          >
            cybercrime.gov.in
          </a>
          . Please also report the user to us so we can remove them.
        </p>
      </Section>

      <Section id="moderation" number={9} title="Reporting, moderation and enforcement">
        <Sub title="How to report">
          <p>
            Every profile and every conversation has a <strong>Report</strong> option. You can
            report harassment, inappropriate photographs, spam or scams, a fake profile, a user you
            believe is underage, or anything else. Reporting a user also{' '}
            <strong>blocks</strong> them by default. A block is enforced by our database, not just
            hidden in the interface: a blocked user cannot message you or call you, even if they try
            to work around the app.
          </p>
          <p>
            You can also email <Fill>[safety@yourdomain]</Fill>, or contact our Grievance Officer
            (section 12).
          </p>
        </Sub>
        <Sub title="How reports are handled">
          <p>
            Reports are reviewed by our team. Depending on severity we may take no action, issue a
            warning, remove content, restrict features, suspend the account, or permanently ban the
            user and any other accounts we associate with them. Reports alleging that a user is a
            minor, or involving credible threats of violence or child sexual exploitation, are
            prioritised and the reported account is suspended pending review.
          </p>
          <p>
            We aim to acknowledge reports within <Fill>[24 hours]</Fill> and to resolve them within{' '}
            <Fill>[15 days]</Fill>, and to act on complaints about non-consensual intimate imagery
            within <strong>24 hours</strong> as required by Rule 3(2)(b) of the Information
            Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
          </p>
          <p>
            We are not obliged to tell you the outcome of a report about another person, and privacy
            law generally prevents us from doing so.
          </p>
        </Sub>
        <Sub title="Our discretion">
          <p>
            We may suspend, restrict or terminate any account, remove any content, and refuse
            service to anyone, <strong>at our sole discretion, at any time, with or without notice,
            and without any obligation to give reasons</strong>. We are not liable to you or anyone
            else for doing so. No refund is due where an account is terminated for breach of these
            Terms.
          </p>
          <p>
            We are an intermediary. We do not pre-screen content, and we are under no general
            obligation to monitor it. Where we do act on content, we do so in reliance on the safe
            harbour available to intermediaries under section 79 of the Information Technology Act,
            2000, and voluntarily removing content does not make us the author or publisher of
            anything we did not remove.
          </p>
        </Sub>
      </Section>

      <Section id="account" number={10} title="Your account, and ending it">
        <p>
          You are responsible for keeping your login credentials secure and for all activity under
          your account. Tell us immediately at <Fill>[support@yourdomain]</Fill> if you suspect
          unauthorised access.
        </p>
        <p>
          You may delete your account at any time from the app. Deleting your account removes your
          profile from discovery and deletes your data as described in the{' '}
          <a href="/privacy" className="text-primary hover:underline underline-offset-2">
            Privacy Policy
          </a>
          , subject to the limited retention we are legally required to apply. Messages you sent may
          remain visible to the people you sent them to.
        </p>
        <p>
          Sections 5, 6, 7, 8, 11 and 13 survive the termination of your account for any reason.
        </p>
      </Section>

      <Section id="law" number={11} title="Governing law and dispute resolution">
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-laws rules.
        </p>
        <Sub title="Talk to us first">
          <p>
            Most disputes can be resolved informally. Before starting any formal proceeding, please
            contact our Grievance Officer (section 12) and give us{' '}
            <Fill>[30 days]</Fill> to resolve the matter.
          </p>
        </Sub>
        <Sub title="Arbitration">
          <p>
            Any dispute arising out of or in connection with these Terms that is not resolved
            informally will be referred to and finally resolved by arbitration under the Arbitration
            and Conciliation Act, 1996. The arbitration will be conducted by a sole arbitrator
            appointed by <Fill>[LEGAL ENTITY NAME]</Fill>, seated in{' '}
            <Fill>[CITY, STATE]</Fill>, and conducted in English. The award is final and binding.
          </p>
          <p>
            To the extent permitted by law, disputes will be resolved on an{' '}
            <strong>individual basis</strong>, and you agree not to bring or participate in any
            class, collective or representative proceeding.
          </p>
        </Sub>
        <Sub title="Courts">
          <p>
            Subject to the arbitration clause above, the courts at{' '}
            <Fill>[CITY, STATE]</Fill> have exclusive jurisdiction. Nothing in this section prevents
            either party from seeking urgent interim relief from a court, or prevents you from
            bringing a complaint before a consumer forum or a data-protection authority where the
            law gives you that right regardless of what this agreement says.
          </p>
        </Sub>
      </Section>

      <Section id="grievance" number={12} title="Grievance Officer">
        <p>
          In accordance with the Information Technology Act, 2000 and Rule 3(2) of the Information
          Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the
          details of our Grievance Officer are:
        </p>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p>
            <strong>Name:</strong> <Fill>[FULL NAME]</Fill>
          </p>
          <p>
            <strong>Designation:</strong> Grievance Officer
          </p>
          <p>
            <strong>Email:</strong> <Fill>[grievance@yourdomain]</Fill>
          </p>
          <p>
            <strong>Address:</strong> <Fill>[full postal address in India]</Fill>
          </p>
          <p>
            <strong>Hours:</strong> <Fill>[Mon–Fri, 10:00–18:00 IST]</Fill>
          </p>
        </div>
        <p>
          The Grievance Officer will acknowledge a complaint within <strong>24 hours</strong> and
          dispose of it within <strong>15 days</strong> of receipt, as required by those Rules.
        </p>
      </Section>

      <Section id="general" number={13} title="General">
        <List
          items={[
            <>
              <strong>Entire agreement.</strong> These Terms and the Privacy Policy are the entire
              agreement between you and us about the Service.
            </>,
            <>
              <strong>Severability.</strong> If any provision is held unenforceable, it is severed
              and the remainder continues in force.
            </>,
            <>
              <strong>No waiver.</strong> If we do not enforce a right, that is not a waiver of it.
            </>,
            <>
              <strong>Assignment.</strong> You may not assign these Terms. We may assign them to an
              affiliate or in connection with a merger or sale of assets.
            </>,
            <>
              <strong>No agency.</strong> Nothing in these Terms creates a partnership, employment,
              agency or joint-venture relationship between you and us.
            </>,
            <>
              <strong>Force majeure.</strong> We are not liable for any failure to perform caused by
              events outside our reasonable control.
            </>,
          ]}
        />
      </Section>

      <Section id="contact" number={14} title="Contact us">
        <p>
          <Fill>[LEGAL ENTITY NAME]</Fill>
          <br />
          <Fill>[registered address]</Fill>
          <br />
          General support: <Fill>[support@yourdomain]</Fill>
          <br />
          Safety and abuse: <Fill>[safety@yourdomain]</Fill>
          <br />
          Legal and IP: <Fill>[legal@yourdomain]</Fill>
          <br />
          Grievances: <Fill>[grievance@yourdomain]</Fill>
        </p>
      </Section>
    </LegalPage>
  )
}
