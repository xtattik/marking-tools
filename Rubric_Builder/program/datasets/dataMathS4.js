window.RUBRIC_DATASETS = window.RUBRIC_DATASETS || {};
window.RUBRIC_DATASETS["math-s4"] = {
  "label": "Mathematics – Stage 4",
  "summary": {
    "count": 15,
    "skills": 0,
    "content": 15,
    "codes": [
      "MAO-WM-01",
      "MA4-ALG-C-01",
      "MA4-LIN-C-01",
      "MA4-ARE-C-01",
      "MA4-GEO-C-01",
      "MA4-PRO-C-01",
      "MA4-FRC-C-01",
      "MA4-IND-C-01",
      "MA4-LEN-C-01",
      "MA4-VOL-C-01",
      "MA4-DAT-C-01",
      "MA4-RAT-C-01",
      "MA4-EQU-C-01",
      "MA4-PYT-C-01",
      "MA4-ANG-C-01",
      "MA4-DAT-C-02"
    ]
  },
  "rubrics": [
    {
      "id": "MAO-WM-01",
      "code": "MAO-WM-01",
      "title": "Working Mathematically",
      "description": "develops understanding and fluency in mathematics through exploring and connecting mathematical concepts, choosing and applying mathematical techniques to solve problems, and communicating their thinking and reasoning coherently and clearly",
      "sheet": "Working Mathematically",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Knows very little about the mathematical ideas being studied, and what they do know exists as disconnected fragments — a word here, a half-remembered procedure there. Can't yet explain their thinking in any meaningful way, and mathematical language is either absent or used incorrectly.",
            "D": "Has a foothold in some mathematical concepts but tends to see each topic as its own separate thing. Can describe a step or two in a familiar process, but explanations are incomplete and reasoning is hard to follow. Mathematical language is sometimes imprecise or used in the wrong context.",
            "C": "Understands the main ideas being studied and can begin to see how they relate to each other — for example, recognising the connection between fractions, decimals and percentages. Communicates their working clearly, uses appropriate mathematical language, and can give a reasonable explanation of their reasoning.",
            "B": "Sees mathematics as a connected whole rather than a collection of separate topics — can explain how different ideas link together and represent the same concept in multiple ways. Communicates with precision, choosing diagrams, symbols or language to suit what they're trying to show, and explains not just what they did but why it works.",
            "A": "Has a deep, fluent understanding of mathematical ideas and can bring concepts from different areas together to make sense of something complex. Explains the reasoning behind rules and procedures — not just how to apply them — and communicates this clearly and logically, adjusting their explanation depending on the situation.",
            "A++": "Thinks and communicates like a mathematician — independently making and justifying generalisations, constructing logical arguments, and recognising connections that go well beyond what has been taught. Their explanations reveal genuine mathematical insight rather than simply demonstrating mastery of familiar content."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Struggles to get started on problems without direct support, and when they do attempt one, tends to guess or apply a method at random. Often can't interpret what the question is asking.",
            "D": "Can work through a simple, familiar problem with some guidance, but relies on a single approach and struggles when the question changes slightly or requires more than one step. Chooses methods with prompting rather than independently.",
            "C": "Solves familiar, routine problems independently, applying the techniques they've learned in the contexts they've practised. Makes reasonable method choices, checks their answers for sense, and can work through problems with a few steps — though may need support when the problem is genuinely unfamiliar.",
            "B": "Draws on a range of techniques and can choose between them depending on what the problem needs. When one approach isn't working, they try another. Can explain their solution process, identify where things might go wrong, and consider alternative methods — not just get to the answer.",
            "A": "Tackles complex, unfamiliar problems with genuine flexibility — reaching for the right strategy even when the problem doesn't look like anything they've seen before. Solves non-routine tasks efficiently and can clearly articulate their reasoning, including the connections and decisions made along the way.",
            "A++": "Goes beyond solving given problems — notices patterns, tests ideas, poses their own questions, and constructs arguments. Applies mathematical thinking with the curiosity and rigour of someone who sees maths as a tool for making sense of the world, not just a set of techniques to execute."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-ALG-C-01",
      "code": "MA4-ALG-C-01",
      "title": "Algebra",
      "description": "generalises number properties to operate with algebraic expressions including expansion and factorisation",
      "sheet": "Algebra",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has little grasp of algebraic ideas — struggles with the meaning of terms, the structure of expressions, and the idea of a variable. Makes frequent errors with signs and notation and finds it difficult to apply the distributive law even in simple cases.",
            "D": "Has some awareness of how algebraic manipulation works but applies it unreliably. Attempts to expand or factorise but makes consistent sign or notation errors, and tends to deal with one small piece of an expression at a time without seeing the whole structure.",
            "C": "Understands and applies the key algebraic manipulations at this stage — expanding using the distributive law, identifying like terms, simplifying expressions, and factorising using common factors. Works accurately in familiar forms and uses correct algebraic notation.",
            "B": "Works fluently with a wider range of algebraic forms — including expanding binomial products and factorising simple quadratics such as the difference of two squares. Can explain the steps in a manipulation and understands why each one works, not just how to carry it out.",
            "A": "Has a deep, flexible command of algebraic manipulation — including more complex factorisation techniques such as grouping or trinomials — and can apply these across varied and unfamiliar expressions. Communicates their reasoning precisely, justifying each step and connecting the algebraic process to the underlying mathematical structure.",
            "A++": "Moves beyond applying algebraic techniques to understanding what they reveal — exploring, for example, how factorisation connects to the roots of a quadratic or the features of a graph. Constructs and justifies their own algebraic arguments, extending ideas beyond the boundaries of Stage 4."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot reliably expand or factorise even basic expressions and needs significant guidance at every step. Finds it very difficult to represent a problem algebraically or know where to begin.",
            "D": "Can follow a procedure for expanding or factorising with support, but relies on prompts for each step and struggles to apply these skills independently to solve a problem. Tends to work one step at a time without a clear sense of the overall goal.",
            "C": "Accurately expands and factorises in the standard forms covered at this stage and can use these skills to solve straightforward algebraic problems. Checks their work and recognises when an answer looks reasonable.",
            "B": "Applies methods like FOIL and difference of two squares correctly and can analyse an expression to decide on the most efficient approach. Solves multi-step problems, explains why a strategy works, and can adapt their method if a first attempt doesn't lead anywhere useful.",
            "A": "Applies advanced factorisation strategies in unfamiliar contexts, generalising patterns noticed across different expression types. Independently solves non-standard problems and extends algebraic reasoning into new territory — for example, exploring what a factorised form reveals about solutions or graphs.",
            "A++": "Uses algebraic manipulation as a lens for exploration — asking what a factored form implies, connecting it to other representations, and constructing arguments that go beyond what's been taught. Proposes and justifies generalisations about algebraic structure."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-LIN-C-01",
      "code": "MA4-LIN-C-01",
      "title": "Linear Relationships",
      "description": "creates and displays number patterns and finds graphical solutions to problems involving linear relationships",
      "sheet": "Linear Relationships",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has little understanding of what a pattern is or how it might connect to a graph. Attempts at graphs are inaccurate or incomplete — axes may be missing or mislabelled, and points are often incorrectly plotted.",
            "D": "Recognises that patterns and graphs are related but struggles to move reliably between them. Can read simple values from a graph but may have trouble with scale or identifying a trend. Sees the table, the rule, and the graph as separate rather than three views of the same thing.",
            "C": "Understands that a pattern can be expressed as a rule and shown as a straight-line graph. Identifies gradient and y-intercept intuitively, plots points accurately, and draws graphs correctly from tables of values or equations. Sees the connection between the algebraic and graphical representations.",
            "B": "Has a solid understanding of y = mx + c and what each part means — can move fluently between equations, tables, and graphs, and can work backwards from a graph to find its equation. Explains the connections between representations clearly, rather than treating each as a separate skill.",
            "A": "Interprets linear models with depth — understanding what gradient and y-intercept mean in a real-world context, not just as numbers in a formula. Uses linear relationships to make predictions and solve novel problems, bringing together algebraic and graphical reasoning fluidly.",
            "A++": "Explores the boundaries and limitations of linear models — comparing multiple relationships, asking when a linear model stops being appropriate, and beginning to reason about what non-linear behaviour might look like. Approaches linear relationships as a modelling tool, not just a graphing exercise."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot represent a pattern as a table or graph without significant help, and struggles to make sense of even simple graphs.",
            "D": "Can construct a basic table or graph with guidance but accuracy is inconsistent — scales may be uneven, points misplotted, or labels missing. Can extract a simple value from a graph when prompted but struggles to reason beyond the immediate data.",
            "C": "Applies the rule for a pattern, creates accurate tables and graphs, and can use a linear relationship to find missing values or answer questions about the pattern. Solves familiar graphing problems with independence.",
            "B": "Moves flexibly between algebraic and graphical representations to solve contextual problems — choosing whichever form is most useful and explaining what the gradient and y-intercept mean in the specific situation. Solves multi-step problems that require interpreting, not just constructing, a linear model.",
            "A": "Creates and uses linear models to solve problems in genuinely new contexts — interpreting solutions within the given constraints and justifying conclusions with reference to the model. Reaches for linear reasoning in situations where it wasn't explicitly suggested.",
            "A++": "Independently designs, critiques, and extends linear models — asking whether a linear relationship is the right tool for a given situation, comparing models, and beginning to explore what happens when relationships are no longer linear."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-ARE-C-01",
      "code": "MA4-ARE-C-01",
      "title": "Area",
      "description": "applies knowledge of area and composite area involving triangles, quadrilaterals and circles to solve problems",
      "sheet": "Area",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has a limited understanding of area — may confuse it with perimeter or volume, and struggles to recall formulas for even simple shapes. Finds it difficult to identify the correct dimensions needed for a calculation or visualise what area actually represents.",
            "D": "Knows basic area formulas for simple shapes like rectangles and triangles but has gaps in applying them — particularly when shapes are less familiar or when different formulas need to be chosen. May make errors with units or struggle to identify dimensions correctly.",
            "C": "Understands and correctly applies area formulas for the standard shapes at this stage — rectangles, triangles, parallelograms and circles. Can identify composite shapes and decompose them into simpler parts. Works with correct units and performs calculations with reasonable accuracy.",
            "B": "Applies area knowledge across a range of shapes and can break down more complex composite figures systematically. Understands the connections between different formulas and can explain why a particular approach works. Handles unit conversions and can work backwards to find a missing dimension when the area is known.",
            "A": "Brings together multiple area formulas fluently to solve complex, multi-step problems — including those involving composite shapes, unit conversions, and situations not explicitly practised. Communicates reasoning clearly, justifying formula choices and checking that answers are sensible in context.",
            "A++": "Applies area concepts to open-ended or optimisation problems — for example, exploring how shapes with the same area can have very different perimeters, or designing a figure to meet specific constraints. Sees area not just as a calculation but as a tool for reasoning about space and design."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot solve basic area problems for single shapes without significant assistance, and often struggles to identify which formula to use or which dimensions are relevant.",
            "D": "Can find the area of simple, familiar shapes with guidance but loses confidence with composite figures or multi-step problems. May make errors in calculations or use incorrect units.",
            "C": "Solves routine area problems for standard shapes and simple composite figures with reasonable independence. Identifies the correct approach, performs calculations accurately, and uses appropriate units.",
            "B": "Solves more complex composite area problems by decomposing shapes strategically and selecting the most efficient method. Can explain their reasoning and consider alternative approaches. Handles problems that require unit conversion or working backwards from a given area.",
            "A": "Tackles challenging, unfamiliar area problems — including those involving irregular composite shapes or real-world design contexts — bringing together multiple strategies and justifying each decision. Identifies potential pitfalls and addresses them systematically.",
            "A++": "Poses and investigates their own area-based questions — for example, exploring optimisation problems or investigating relationships between area and other measurements. Applies area reasoning in contexts well beyond standard practice, showing genuine mathematical curiosity."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-GEO-C-01",
      "code": "MA4-GEO-C-01",
      "title": "Geometry",
      "description": "identifies and applies the properties of triangles and quadrilaterals to solve problems",
      "sheet": "Geometry",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has a limited grasp of basic geometric terms and frequently confuses different shapes or their properties. May mislabel sides, angles or vertices, and struggles to recall or apply even simple angle rules.",
            "D": "Recognises common triangles and quadrilaterals and knows some of their properties, but may have misconceptions about angle or side relationships. Can use geometric notation with support.",
            "C": "Understands and applies the key properties of triangles and standard quadrilaterals — including angle sums, parallel sides and symmetry. Uses correct geometric notation, interprets diagrams accurately, and can find unknown angles or sides in straightforward problems.",
            "B": "Works confidently across a broader range of triangle and quadrilateral types, linking properties together to solve multi-step problems. Can identify congruent or similar triangles, apply Pythagoras' Theorem in geometric contexts, and support reasoning with logical, step-by-step working.",
            "A": "Applies geometric properties fluently in complex, multi-step problems — including those involving less common shapes like kites and trapeziums, or diagrams where multiple properties interact. Constructs well-reasoned geometric arguments and uses diagrams purposefully to support thinking.",
            "A++": "Engages with geometry beyond the routine — exploring proofs, investigating properties of tessellations or coordinate-based shapes, and reasoning through problems that require synthesis across multiple geometric ideas. Approaches geometry with the rigour and curiosity of someone genuinely interested in why things are true, not just that they are."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot solve basic geometric problems involving triangles or quadrilaterals without direct instruction. Struggles to identify relevant properties or apply any angle rules to find unknowns.",
            "D": "Solves simple geometric problems with help but may not be able to explain the reasoning or verify whether an answer is geometrically plausible. Identifies some relevant properties with prompting.",
            "C": "Solves standard problems involving unknown angles or sides in triangles and basic quadrilaterals with limited support. Uses correct properties and notation, and can check that answers are consistent with the shape's properties.",
            "B": "Tackles multi-step geometric problems confidently, drawing on several properties in sequence and explaining each step. Can identify which property applies in a given situation and adapt when the first approach doesn't immediately work.",
            "A": "Solves complex problems that require combining multiple geometric ideas — for example, using properties of parallel lines, triangle congruence and angle relationships together in a single diagram. Justifies conclusions clearly and considers whether alternative approaches are possible.",
            "A++": "Constructs geometric proofs and investigates properties that haven't been explicitly taught — reasoning with precision and confidence across unfamiliar territory, and connecting geometric ideas to other areas of mathematics."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-PRO-C-01",
      "code": "MA4-PRO-C-01",
      "title": "Probability",
      "description": "solves problems involving the probabilities of simple chance experiments",
      "sheet": "Probability",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has a limited understanding of chance — struggles with basic probability language and finds it difficult to identify all possible outcomes of a simple experiment. May express likelihood in vague or incorrect terms.",
            "D": "Understands basic chance language like 'likely' and 'unlikely' but uses probability terms inconsistently. May struggle to list a complete sample space or express probabilities numerically with confidence.",
            "C": "Understands the probability scale from 0 to 1 and can describe outcomes across the full range from impossible to certain. Lists sample spaces correctly for simple experiments and expresses probabilities as fractions, decimals or percentages, converting fluently between forms.",
            "B": "Understands the difference between theoretical and experimental probability and can reason about why results vary across trials. Uses representations like tables or tree diagrams to organise outcomes and calculates probabilities accurately and clearly.",
            "A": "Applies probability reasoning to more complex situations — including those involving multiple outcomes or informal compound events — and uses probability to make predictions and assess fairness. Communicates strategies and justifications with precision.",
            "A++": "Investigates probability beyond standard exercises — designing and testing games, analysing fairness, or exploring what happens to experimental probability as the number of trials grows. Connects probability reasoning to real-world decision-making with genuine insight."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot complete a probability task for basic experiments without significant guidance. Misinterprets probability values or struggles to identify favourable outcomes.",
            "D": "Solves very simple probability problems with guidance but may not be able to explain the reasoning or check whether an answer is plausible.",
            "C": "Solves straightforward probability problems independently — finding probabilities for single experiments, expressing them in different forms, and checking that answers fall within the valid range.",
            "B": "Solves problems involving multiple outcomes and uses probability to compare options or make informal predictions. Can interpret data from chance experiments to estimate probabilities and explain what the results suggest.",
            "A": "Tackles more complex probability problems involving multiple or compound events, using systematic methods to ensure all outcomes are counted. Uses probability reasoning to draw conclusions, assess fairness, and make justified predictions.",
            "A++": "Designs, conducts and analyses their own probability investigations — testing whether a game is fair, simulating experiments with large numbers of trials, or exploring how changing the rules affects the probabilities. Explains findings with clarity and statistical reasoning."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-FRC-C-01",
      "code": "MA4-FRC-C-01",
      "title": "Fractions, Decimals and Percentages",
      "description": "represents and operates with fractions, decimals and percentages to solve problems",
      "sheet": "Fractions, Decimals and Percentages",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has limited understanding of fractions, decimals and percentages as related ideas — may confuse their meaning or struggle with basic concepts like equivalent fractions or what a percentage actually represents. Makes frequent errors in calculations and equivalent forms.",
            "D": "Has a basic grasp of fractions, decimals and percentages individually but struggles when moving between them — particularly with conversions beyond common cases. May rely heavily on calculators and make errors in straightforward operations.",
            "C": "Understands fractions, decimals and percentages as different representations of the same quantity and converts between them fluently. Performs the four operations accurately, calculates percentages of quantities, simplifies fractions, and applies order of operations correctly.",
            "B": "Works confidently with fractions, decimals and percentages across a range of contexts — including shopping scenarios, scale drawings and recipes — and can explain the steps and reasoning involved. Handles unlike denominators, checks answers for reasonableness, and makes connections between the different number forms.",
            "A": "Applies rational number skills fluently in multi-step, real-world problems — bringing together operations with fractions, decimals and percentages in situations that require careful reasoning. Makes generalisations about how operations with rational numbers behave and can justify them.",
            "A++": "Explores rational numbers beyond the familiar — designing multi-step financial or measurement problems, comparing representations to find the most efficient approach, and reasoning about the structure of rational numbers in ways that extend the standard curriculum."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Unable to solve basic problems involving fractions, decimals or percentages, even with support. Struggles to interpret what the question is asking or which operation is needed.",
            "D": "Solves simple, one-context problems with guidance but makes errors in reasoning or calculation. May struggle to connect the numerical answer back to the situation.",
            "C": "Solves familiar one- and two-step problems involving fractions, decimals and percentages — such as calculating discounts, finding a percentage of a quantity, or working with proportions. Checks answers and recognises when a result looks unreasonable.",
            "B": "Solves multi-step problems that combine fractions, decimals and percentages in realistic contexts. Chooses an efficient method, explains the reasoning, and interprets the result meaningfully in the given situation.",
            "A": "Tackles complex, multi-step real-world problems involving rational numbers — such as budgeting, comparing financial offers, or interpreting scale drawings — and justifies each step. Reaches for fraction and percentage reasoning in situations where the approach wasn't prescribed.",
            "A++": "Designs and investigates their own problems involving rational numbers — comparing loan structures, modelling savings, or exploring what percentage relationships reveal about a dataset. Applies rational number reasoning with genuine sophistication and independence."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-IND-C-01",
      "code": "MA4-IND-C-01",
      "title": "Indices",
      "description": "operates with primes and roots, positive-integer and zero indices involving numerical bases and establishes the relevant index laws",
      "sheet": "Indices",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has limited understanding of index notation, prime numbers or square roots — may confuse the meaning of a power, struggle to identify prime numbers, or use notation incorrectly. Makes frequent errors with basic calculations involving indices.",
            "D": "Has some understanding of squares, cubes and basic index notation but applies index laws inconsistently and with frequent errors — particularly when combining terms or working with zero exponents. May confuse different index laws.",
            "C": "Understands and applies the key index laws for multiplication and division of powers with the same base. Can find prime factorisations, evaluate square and cube roots, and work correctly with positive integer and zero indices using proper notation.",
            "B": "Works fluently with index laws across a range of expressions — including powers of powers — and can explain the reasoning behind each law rather than just applying it mechanically. Connects roots to fractional indices and uses factor trees and index rules together efficiently.",
            "A": "Applies index laws and root concepts in varied and unfamiliar expressions, including those involving negative and fractional exponents. Communicates reasoning clearly, explains generalisations arising from the laws, and connects exponential ideas to patterns of growth or decay.",
            "A++": "Investigates index laws beyond the standard curriculum — exploring irrational roots geometrically, comparing exponential growth rates, or extending index reasoning to algebraic bases. Constructs arguments about why index laws work, not just that they do."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Struggles to simplify or evaluate even basic expressions involving indices or roots, and cannot identify prime factors of small numbers without significant support.",
            "D": "Solves basic index problems but often relies on trial and error rather than applying laws deliberately. May arrive at a correct answer without being able to explain the process.",
            "C": "Applies index laws correctly to simplify expressions and solve familiar problems — including finding prime factorisations and evaluating expressions with square roots and basic powers. Checks work and recognises when a simplified form looks reasonable.",
            "B": "Solves multi-step problems involving several index laws, negative or zero exponents, and combinations of roots and powers. Analyses expressions to determine the most efficient path to a solution and can explain each step.",
            "A": "Tackles unfamiliar index problems confidently — including those involving algebraic bases or non-standard exponent forms — and generalises patterns observed across examples. Connects index reasoning to broader mathematical ideas such as exponential growth.",
            "A++": "Explores index concepts in novel contexts — proving why index rules hold, comparing exponential functions, or applying index laws in science or finance. Constructs and justifies their own generalisations about the behaviour of powers and roots."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-LEN-C-01",
      "code": "MA4-LEN-C-01",
      "title": "Perimeter and Circumference",
      "description": "applies knowledge of the perimeter of plane shapes and the circumference of circles to solve problems",
      "sheet": "Perimeter and Circumference",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has a limited understanding of perimeter and may confuse it with area. Struggles to recall formulas for simple shapes and finds it difficult to identify the dimensions needed for a calculation.",
            "D": "Knows the basic idea of perimeter and can recall some formulas, but may confuse shapes or misapply the circumference formula — for example, mixing up diameter and radius. Makes errors with units or calculations in less familiar cases.",
            "C": "Understands and recalls formulas for the perimeter of common polygons and the circumference of a circle. Uses π correctly, applies formulas accurately to single shapes, and uses consistent, appropriate units throughout.",
            "B": "Applies perimeter and circumference knowledge across a range of shapes and composite figures — including those requiring unit conversions or working backwards to find a missing dimension. Explains reasoning and can break down complex shapes into manageable parts.",
            "A": "Solves complex, multi-step problems involving perimeter and circumference in varied real-world contexts — choosing the right approach, justifying formula selections, and interpreting results meaningfully. Connects these ideas to related concepts such as arc length.",
            "A++": "Explores perimeter and circumference beyond standard problems — investigating how perimeter and area relate for shapes with the same dimensions, or designing figures that satisfy specific perimeter constraints. Approaches measurement as a mathematical tool for reasoning, not just calculation."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot solve basic perimeter or circumference problems without significant help, and often cannot identify which formula applies or which dimensions to use.",
            "D": "Solves simple, familiar perimeter problems with guidance but struggles with circumference or composite shapes. May make calculation errors or fail to interpret what the answer means in context.",
            "C": "Solves routine problems involving perimeter and circumference of standard shapes and simple composites with limited support. Identifies the correct formula, performs calculations accurately, and provides an answer with appropriate units.",
            "B": "Solves multi-step and real-world problems — for example, calculating fencing for an irregularly shaped garden or finding the circumference needed for a specific design — and explains the reasoning at each step. Handles unit conversions and can work backwards from a known perimeter.",
            "A": "Approaches unfamiliar perimeter and circumference problems with flexibility — combining multiple formulas, reasoning about partial shapes such as semicircles, and interpreting the mathematical result within the context of the problem.",
            "A++": "Investigates open-ended perimeter problems — exploring relationships between perimeter, area and shape, or designing objects with specific constraints. Applies algebraic reasoning to express and manipulate perimeter formulas in general terms."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-VOL-C-01",
      "code": "MA4-VOL-C-01",
      "title": "Volume and Capacity",
      "description": "applies knowledge of volume and capacity to solve problems involving right prisms and cylinders",
      "sheet": "Volume and Capacity",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has limited understanding of volume and capacity — may confuse them with area, or struggle to identify the relevant dimensions for a three-dimensional shape. Finds it difficult to recall or apply the appropriate formula.",
            "D": "Has a basic understanding of volume for simple shapes like cubes and rectangular prisms but has gaps when it comes to cylinders or prisms with less familiar bases. May make errors with units or dimensions.",
            "C": "Understands and applies volume formulas for right prisms and cylinders correctly. Identifies the relevant dimensions, uses appropriate units including conversions between units of volume and capacity, and performs calculations with reasonable accuracy.",
            "B": "Works confidently with volume and capacity across a range of shapes — including those with composite cross-sections — and can explain the relationship between the formulas and the geometry of the shape. Understands how changing dimensions affects volume and can work backwards to find a missing measurement.",
            "A": "Applies volume and capacity reasoning to complex, multi-step problems — including real-world contexts involving optimisation, material estimation, or unit conversion. Communicates reasoning clearly and justifies the approach taken.",
            "A++": "Explores volume and capacity beyond the standard problems — for instance, investigating how surface area and volume relate for different container designs, or applying volume reasoning to analyse real engineering or environmental problems."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot solve basic volume or capacity problems without significant guidance — often unsure which formula applies, which dimensions to use, or how to set up the calculation.",
            "D": "Can solve simple volume problems with some support, but struggles with cylinders, composite shapes, or problems requiring unit conversion.",
            "C": "Solves routine volume and capacity problems for right prisms and cylinders with reasonable independence. Identifies the correct formula, uses the right dimensions, and provides an answer with appropriate units.",
            "B": "Solves more complex problems — including those with composite shapes, unit conversions, or real-world contexts such as determining how much material fills a container. Explains the solution process and can consider whether a different approach might be more efficient.",
            "A": "Tackles unfamiliar or multi-step volume problems confidently — for example, comparing the capacity of different container designs or determining how a change in dimensions affects volume. Justifies the strategy and interprets the result meaningfully within the context.",
            "A++": "Investigates volume and capacity in open-ended or design contexts — exploring optimisation questions, analysing the relationship between volume and surface area, or applying volume reasoning to real-world problems in science, engineering or sustainability."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-DAT-C-01",
      "code": "MA4-DAT-C-01",
      "title": "Data Classification and Display",
      "description": "classifies and displays data using a variety of graphical representations",
      "sheet": "Data Classification and Display",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has limited understanding of how data is classified or displayed. Attempts at graphs are often incomplete or incorrect — missing axes, labels or values — and may choose an inappropriate graph type for the data without realising it.",
            "D": "Recognises that different graph types exist and has some awareness of when each might be used, but may confuse them or produce poorly scaled or labelled graphs that are difficult to interpret.",
            "C": "Classifies data appropriately and constructs common graph types — bar graphs, column graphs, line graphs and pie charts — accurately and with correct labels, axes and scales. Understands the purpose of each graph type and can interpret what a graph shows.",
            "B": "Works with a wider range of graph types including histograms, dot plots and stem-and-leaf plots, choosing the form that best suits the data and the question being asked. Explains why a particular display is effective and understands the strengths and limitations of different representations.",
            "A": "Selects and constructs graphs with real purpose — using features like scale, intervals and categories deliberately to highlight patterns or support a conclusion. Interprets graphs critically, identifying trends, potential misrepresentations and what the data does and doesn't show.",
            "A++": "Approaches data display as a tool for communication and argument — creating multiple representations of the same dataset to show different insights, questioning how graph design choices can mislead, and justifying display decisions with reference to the data type and intended audience."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot draw meaningful conclusions from graphs and struggles to construct even a basic display. Interpretation is minimal or missing entirely.",
            "D": "Can read simple information from a graph with prompting but may struggle to connect the display back to the original data or draw valid conclusions. Graphs produced may be incomplete or hard to interpret.",
            "C": "Constructs appropriate graphs for given datasets and can identify key features or trends — though explanations of what the graph shows may be hesitant or lack depth. Interprets straightforward graphs correctly and answers questions about the data displayed.",
            "B": "Chooses effective graph types for specific datasets and purposes, explains key trends and patterns clearly, and can compare data across different displays. Identifies when a graph might be misleading or incomplete.",
            "A": "Uses data displays to investigate questions and draw justified conclusions — selecting graph types deliberately, interpreting results critically, and making inferences that go beyond simply reading values off axes. Identifies potential limitations in how data has been collected or displayed.",
            "A++": "Creates multiple representations of a dataset to explore different aspects of the data, justifies display choices with reference to data type and audience, and critically evaluates how different graph designs can highlight or obscure patterns. Approaches data display as a form of mathematical argument."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-RAT-C-01",
      "code": "MA4-RAT-C-01",
      "title": "Ratios, Rates and Distance-Time Graphs",
      "description": "solves problems involving ratios and rates, and analyses distance–time graphs",
      "sheet": "Ratios, Rates and Distance-Time Graphs",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has limited understanding of ratio and rate concepts — struggles with basic terminology and finds it difficult to interpret even simple graphs, including identifying which axis represents which quantity.",
            "D": "Understands the basic idea of a ratio or rate but may confuse the order of quantities or apply them inconsistently. Can read simple information from a distance-time graph but misinterprets what slope or a flat section represents.",
            "C": "Understands ratio and rate clearly, can simplify and find equivalent ratios, calculate unit rates, and interpret distance-time graphs — recognising that slope represents speed, and that a horizontal section means no movement. Converts between rates with reasonable accuracy.",
            "B": "Works fluently with ratios and rates across a variety of contexts, connecting proportional reasoning to graphical representations. Can determine speed from the gradient of a distance-time graph, compare rates across situations, and construct graphs that accurately represent described motion.",
            "A": "Applies ratio, rate and graphical reasoning to complex or multi-step problems — including those involving variable rates, multi-stage journeys, or comparing proportional relationships across different contexts. Communicates reasoning clearly and justifies conclusions.",
            "A++": "Investigates ratio and rate in novel or open-ended contexts — for example, analysing a complex distance-time graph to reconstruct a full journey narrative, or applying proportional reasoning to unfamiliar real-world problems. Sees ratio and rate as a lens for understanding relationships, not just a calculation technique."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot set up or solve problems involving ratios or rates without direct support, and struggles to extract meaningful information from a distance-time graph.",
            "D": "Solves basic ratio or rate problems with guidance, often relying on memorised steps without understanding. May misread a distance-time graph or struggle to connect its features to real-world movement.",
            "C": "Solves familiar problems involving ratios, rates and distance-time graphs with reasonable independence — simplifying ratios, calculating unit rates, reading speeds from graphs, and answering questions about distance and time.",
            "B": "Solves multi-step or contextual problems effectively — for example, scaling a recipe using ratios, comparing unit prices, or analysing a distance-time graph to describe periods of different speeds. Explains reasoning and connects the mathematical result to the situation.",
            "A": "Tackles complex ratio and rate problems — including those involving changing rates, multi-stage distance-time graphs, or proportional reasoning in unfamiliar contexts. Justifies solutions and identifies limitations or assumptions in the model.",
            "A++": "Applies ratio and rate reasoning to open-ended investigations — designing scenarios that satisfy specific constraints, comparing proportional models across contexts, or analysing real data involving variable rates. Approaches these ideas as modelling tools, not just calculation procedures."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-EQU-C-01",
      "code": "MA4-EQU-C-01",
      "title": "Equations",
      "description": "solves linear equations of up to 2 steps and quadratic equations of the form ax² = c",
      "sheet": "Equations",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has minimal understanding of what an equation means or how to solve one — struggles to isolate a variable or perform the operations needed to balance both sides, even in simple cases.",
            "D": "Can follow basic steps to solve simple one-step linear equations but loses confidence with two-step problems or when negative numbers, fractions or quadratic forms are involved. May apply inverse operations incorrectly.",
            "C": "Understands the process of solving linear equations with up to two steps and quadratic equations of the form ax² = c. Isolates variables correctly, applies inverse operations in the right order, and recognises that quadratic equations can have two solutions.",
            "B": "Solves both equation types accurately and efficiently, including cases with negative values or fractional coefficients. Explains the reasoning behind each step rather than just following a procedure, and correctly handles both positive and negative square root solutions.",
            "A": "Applies equation-solving techniques fluently across a range of forms and extends the approach to less familiar cases — for example, equations with variables on both sides or those embedded in word problems requiring careful setup. Interprets solutions in context and checks that they make sense.",
            "A++": "Explores equations beyond the standard curriculum — connecting solving techniques to graphical interpretations, investigating the number and nature of solutions, or applying equation reasoning to novel real-world problems. Asks questions about what solutions mean, not just how to find them."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot solve basic linear or quadratic equations independently — requires significant support even for the simplest cases and often doesn't know where to begin.",
            "D": "Can solve simple one- or two-step linear equations with minimal guidance but struggles with quadratic equations or problems that require setting up the equation from a written description.",
            "C": "Solves linear equations with up to two steps and quadratic equations of the form ax² = c independently. Applies inverse operations correctly and checks solutions by substitution.",
            "B": "Solves both equation types confidently across a range of forms, including those with fractional or negative coefficients. Can translate a word problem into an equation, solve it, and interpret the result — including recognising when both positive and negative solutions are relevant.",
            "A": "Applies equation-solving skills in unfamiliar or multi-step contexts — setting up and solving equations from complex word problems, verifying solutions, and reasoning about what the answer means in the given situation. Reaches for algebraic equation methods when they're not explicitly signposted.",
            "A++": "Uses equations as a modelling tool — exploring how changes in the equation affect the solution, connecting algebraic solutions to graphical representations, or applying equation reasoning to investigate real-world scenarios that extend beyond the standard curriculum."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-PYT-C-01",
      "code": "MA4-PYT-C-01",
      "title": "Pythagoras' Theorem",
      "description": "applies Pythagoras' theorem to solve problems in various contexts",
      "sheet": "Pythagoras' Theorem",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has minimal understanding of Pythagoras' theorem — may not be able to recall the relationship or identify which side is the hypotenuse. Struggles to apply the formula even in the most straightforward cases.",
            "D": "Understands that Pythagoras' theorem relates to right-angled triangles and can recall the formula, but may confuse which side is which, make errors in squaring or square-rooting, or struggle when the unknown is one of the shorter sides.",
            "C": "Understands Pythagoras' theorem and applies it correctly to find any unknown side of a right-angled triangle. Identifies the hypotenuse reliably, performs calculations with reasonable accuracy, and applies the theorem in straightforward measurement contexts.",
            "B": "Applies Pythagoras' theorem fluently across a range of contexts — including multi-step problems, word problems, and situations where the right-angle triangle must be identified within a larger diagram. Explains the reasoning at each step and checks whether the answer is geometrically sensible.",
            "A": "Uses Pythagoras' theorem confidently in complex, unfamiliar situations — such as finding distances in coordinate geometry, solving problems in design or navigation, or combining the theorem with other geometric properties. Reaches for Pythagoras as a tool even when its use isn't explicitly suggested.",
            "A++": "Explores Pythagoras' theorem beyond the standard curriculum — investigating its proof, applying it in three-dimensional contexts, connecting it to the distance formula, or discovering its relevance in unexpected real-world areas. Sees it as a principle with wide reach, not just a formula for triangles."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Cannot apply Pythagoras' theorem to solve problems without substantial assistance — often unsure when to use it or how to set up the calculation.",
            "D": "Can solve simple problems such as finding the hypotenuse with some support, but struggles when the unknown is a shorter side, or when the problem is presented in a real-world or multi-step context.",
            "C": "Applies Pythagoras' theorem independently to find any unknown side in a right-angled triangle, including in basic word problems and simple real-world contexts such as finding the diagonal of a rectangle.",
            "B": "Solves multi-step problems using Pythagoras' theorem — including those where the right-angle triangle must be constructed or identified, and those involving distances between points or embedded geometric figures. Explains the solution process clearly.",
            "A": "Tackles complex, unfamiliar problems using Pythagoras' theorem — combining it with other mathematical ideas, applying it in contexts not explicitly practised, and justifying each step. Recognises when Pythagoras is the right tool without being told.",
            "A++": "Applies Pythagoras' theorem in genuinely novel contexts — using it to calculate distances in a self-designed coordinate system, exploring its role in a real-world application like game design or architecture, or investigating generalisations such as the distance formula. Demonstrates the curiosity and initiative of someone who uses mathematics to understand the world around them."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-ANG-C-01",
      "code": "MA4-ANG-C-01",
      "title": "Angle Relationships",
      "description": "applies angle relationships to solve problems, including those related to transversals on sets of parallel lines",
      "sheet": "Angle Relationships",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has minimal understanding of angle relationships — cannot reliably identify angle types in diagrams or recall basic rules. Struggles with the concept of parallel lines and what a transversal produces.",
            "D": "Recognises some angle relationships such as corresponding or alternate angles but may confuse them or apply the wrong rule. Can identify basic angle types in simple diagrams with prompting but makes errors when relationships are less obvious.",
            "C": "Understands and applies the key angle relationships at this stage — including corresponding, alternate and co-interior angles formed by a transversal cutting parallel lines. Identifies angle types correctly in diagrams, uses accurate notation, and finds unknown angles with clear reasoning.",
            "B": "Works confidently with a full range of angle relationships, combining multiple properties in a single problem to find unknown angles step by step. Explains the reasoning behind each step using correct geometric language and justifies conclusions rather than just stating them.",
            "A": "Applies angle relationships fluently in complex, multi-step problems — including those with several transversals, overlapping angle relationships, or real-world contexts. Constructs clear geometric arguments and checks the consistency of solutions.",
            "A++": "Explores angle relationships beyond standard problems — constructing geometric proofs, investigating angle properties in unfamiliar configurations, or applying parallel line reasoning to problems in coordinate geometry. Reasons with precision about why angle relationships hold, not just that they do."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Struggles to solve any problems involving angle relationships and transversals — often cannot identify the relevant angles in a diagram or apply any rule to find an unknown.",
            "D": "Can solve simple angle problems with guidance, identifying one relevant relationship at a time. Struggles when problems require combining more than one angle property or interpreting a more complex diagram.",
            "C": "Solves standard problems involving parallel lines and transversals with reasonable independence — identifying the correct angle relationship, stating the rule, and finding the unknown angle. Checks that answers are consistent with the diagram.",
            "B": "Solves multi-step problems that require using several angle relationships in sequence, explaining the reasoning at each stage. Can work through more complex diagrams and justify conclusions geometrically.",
            "A": "Tackles unfamiliar or complex angle problems — including those involving multiple transversals or contexts where angle reasoning must be combined with other geometric ideas. Constructs logical, well-explained solutions and considers whether alternative approaches are possible.",
            "A++": "Constructs geometric proofs involving angle relationships, investigates properties in novel configurations, or applies parallel line reasoning in abstract or interdisciplinary contexts. Approaches angle relationships as a tool for logical argument, not just a set of rules to recall and apply."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    },
    {
      "id": "MA4-DAT-C-02",
      "code": "MA4-DAT-C-02",
      "title": "Data Analysis",
      "description": "analyses simple datasets using measures of centre, range and shape of the data",
      "sheet": "Data Analysis",
      "type": "content",
      "components": {
        "theory": {
          "label": "Knowledge & Skills",
          "descriptors": {
            "E": "Has limited understanding of mean, median, mode and range — often confuses their definitions or makes errors in basic calculations. Struggles to make sense of what these values tell us about a dataset.",
            "D": "Understands the basic statistical measures and can calculate them in simple cases, but may apply them inconsistently or struggle to interpret what they mean in context. Calculation errors are common, particularly for the mean.",
            "C": "Calculates mean, median, mode and range correctly for a given dataset and uses these to describe key features. Can identify whether data appears symmetrical or skewed based on the relationship between the mean and median, and can spot obvious outliers.",
            "B": "Understands how measures of centre and spread work together to describe a dataset — can explain why the median is sometimes more appropriate than the mean, identify the impact of an outlier on each measure, and interpret the shape of a distribution in terms of symmetry or skew.",
            "A": "Evaluates the suitability of different statistical measures for a given dataset, justifying choices based on the distribution and context. Interprets shape, spread and centre together to draw meaningful conclusions and recognise potential limitations in the data or its summary.",
            "A++": "Investigates statistical questions beyond the standard curriculum — for example, analysing how changing one data point affects all measures, comparing datasets using multiple statistical tools, or interpreting real-world data to make evidence-based recommendations. Approaches data analysis as a form of reasoning under uncertainty."
          }
        },
        "applied": {
          "label": "Problem Solving & Application",
          "descriptors": {
            "E": "Unable to draw conclusions or make inferences from a dataset. Cannot calculate measures of centre or range reliably, even with prompts.",
            "D": "Can find measures of centre and range with guidance but struggles to interpret what they mean or connect them to the context of the data. May make calculation errors or misidentify the median.",
            "C": "Calculates all measures correctly and uses them to answer straightforward questions about a dataset. Can identify basic patterns — for example, noting whether the data is roughly symmetrical or spotting an obvious outlier.",
            "B": "Draws meaningful conclusions from statistical measures — explaining what the centre and spread reveal about the data, comparing two datasets using summary statistics, and identifying how a single unusual value affects the measures.",
            "A": "Analyses datasets with genuine depth — selecting appropriate measures, interpreting distribution and shape, and drawing conclusions that account for outliers and context. Considers what the statistics don't tell you as well as what they do.",
            "A++": "Investigates open-ended statistical questions — comparing datasets from real contexts, exploring how summary statistics can be misleading, or using data analysis to support or challenge a claim. Approaches statistics as a tool for making sense of the world, with an awareness of its limitations."
          }
        }
      },
      "availableModes": ["theory", "applied"],
      "gradeScale": ["E", "D", "C", "B", "A", "A++"]
    }
  ]
};
