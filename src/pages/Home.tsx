import { Comparison } from '../sections/Comparison'
import { Coverage } from '../sections/Coverage'
import { Faq } from '../sections/Faq'
import { Hero } from '../sections/Hero'
import { Process } from '../sections/Process'
import { ServiceShowcase } from '../sections/ServiceShowcase'
import { ValueCards } from '../sections/ValueCards'

export default function Home() {
  return (
    <>
      <Hero />
      <ValueCards />
      <ServiceShowcase />
      <Comparison />
      <Process />
      <Coverage />
      <Faq />
    </>
  )
}
