import type { Type, TypeChecker, Node } from 'ts-morph';

export interface SchemaInfo {
  name: string;
  type: Type;
}

export function resolveType(
  type: Type,
  checker: TypeChecker,
  interfaceName: string,
  node: Node,
  allSchemas: SchemaInfo[],
  seenTypes: Set<Type> = new Set(),
  depth = 0
): string {
  if (depth > 20) return 'any';

  // Check if this type matches ANY of our known global schemas first
  // This preserves the identity of sub-schemas and handles cross-schema recursion correctly
  // We avoid matching primitives to keep them flat and independent as per user's "no external things" rule
  if (!type.isString() && !type.isNumber() && !type.isBoolean() && !type.isStringLiteral() && !type.isNumberLiteral() && !type.isBooleanLiteral()) {
    for (const s of allSchemas) {
      if ((type as any).compilerType === (s.type as any).compilerType) {
        // Don't refer to ourselves if we're just starting the resolution
        if (s.name !== interfaceName || seenTypes.has(type)) {
          return s.name;
        }
      }
    }
  }

  // If we've seen this type before in this path, it's recursive
  if (seenTypes.has(type)) {
    return interfaceName;
  }

  if (type.isStringLiteral()) return `'${type.getLiteralValue()}'`;
  if (type.isNumberLiteral()) return `${type.getLiteralValue()}`;
  if (type.isBooleanLiteral()) return `${type.getLiteralValue()}`;
  if (type.isString()) return 'string';
  if (type.isNumber()) return 'number';
  if (type.isBoolean()) return 'boolean';
  
  if (type.isEnum() || type.isUnion()) {
    const types = type.getUnionTypes()
      .map(t => resolveType(t, checker, interfaceName, node, allSchemas, new Set(seenTypes).add(type), depth + 1));
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.join(' | ');
  }

  if (type.isIntersection()) {
    const types = type.getIntersectionTypes()
      .map(t => resolveType(t, checker, interfaceName, node, allSchemas, new Set(seenTypes).add(type), depth + 1));
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.join(' & ');
  }
  
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    if (elementType) {
      return `${resolveType(elementType, checker, interfaceName, node, allSchemas, new Set(seenTypes).add(type), depth + 1)}[]`;
    }
    return 'any[]';
  }

  // Handle Record<string, T>
  if (type.isObject() && type.getText().startsWith('Record<')) {
    const typeArgs = type.getTypeArguments();
    if (typeArgs.length === 2) {
      const keyType = resolveType(typeArgs[0], checker, interfaceName, node, allSchemas, seenTypes, depth + 1);
      const valueType = resolveType(typeArgs[1], checker, interfaceName, node, allSchemas, seenTypes, depth + 1);
      return `Record<${keyType}, ${valueType}>`;
    }
  }
  
  if (type.isObject() || type.getText().includes('{')) {
    if (type.getText().includes('Promise')) {
      return 'Promise<any>';
    }

    const properties = type.getApparentProperties();
    if (properties.length === 0) {
       const text = type.getText();
       if (text === '{}') return '{}';
       if (type.isStringLiteral()) return `'${type.getLiteralValue()}'`;
       if (type.isNumberLiteral()) return `${type.getLiteralValue()}`;
       
       // Check if it's a mapped type or has index signature
       const stringIndex = type.getStringIndexType();
       if (stringIndex) {
         return `{ [key: string]: ${resolveType(stringIndex, checker, interfaceName, node, allSchemas, seenTypes, depth + 1)} }`;
       }
    }
    
    const nextSeen = new Set(seenTypes).add(type);
    
    let result = '{\n';
    for (const prop of properties) {
      const propName = prop.getName();
      if (propName.startsWith('_')) continue;

      // Better type resolution for properties (handles computed/extended properties)
      const propSymbol = type.getProperty(propName);
      const propType = propSymbol ? checker.getTypeOfSymbolAtLocation(propSymbol, node) : checker.getTypeOfSymbolAtLocation(prop, node);
      
      const isActuallyOptional = (prop as any).isOptional?.() || prop.hasFlags(67108864);

      const resolvedProp = resolveType(propType, checker, interfaceName, node, allSchemas, nextSeen, depth + 1);
      result += `    ${propName}${isActuallyOptional ? '?' : ''}: ${resolvedProp};\n`;
    }

    result += '  }';
    return result;
  }
  
  const text = type.getText();
  if (text.includes('string')) return 'string';
  if (text.includes('number')) return 'number';
  if (text.includes('boolean')) return 'boolean';
  if (text.includes('Date')) return 'string';
  
  return 'any';
}


